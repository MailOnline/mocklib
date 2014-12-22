Mocklib
=======

Utilities for creating and managing mocks (object proxies)

Installation
------------

	npm install --save-dev git+https://matAtWork@bitbucket.org/MailOnline/mocklib.git

Usage
-----
Mocklib provides two ways to mock an object, proxies and mock modules.

Mock Modules
------------
Mock modules are modules that have the same API as a production module, but behave differently for test purposes. An example is 
'fakeredis' [https://github.com/hdachev/fakeredis]. However to use 'fakeredis', you need to change all your require('redis') calls
to require('fakeredis'). Mocklib's mock modules do this for you:

	// Load the module so all other loads refer to the fakeredis
	var redis = require("redis");
	var fakeredis = require("fakeredis") ;
	// Where we meant to use the module 'redis', use 'fakeredis' instead
	mocklib.mockModule(redis,fakeredis) ;
	
All references to the module 'redis' will now resolve to 'fakeredis', even ones that are already loaded. 

Proxies
-------

Proxies allow you to instrument an object with function members, including code you didn't write yourself or don't want to modify (for example because it's already in production). The object reference itself is unmodified (proxy(...) returns whatever you pass it), but all the functions are caught (does not apply to prototypical members) and can be individually trapped. 

For example, consider proxying an object exported from the module "runner" with a functional member called 'run':

	// Load the object, and proxy its functions. You don't 
	// have to 'require' it - it can come from anywhere
	obj = mocklib.proxy(require("./runner")) ;

You can optionally proxy prototypical functions too (add an additional 'true' after the object), but be aware this will alter the semantics of the object - all the proxied prototype functions are hoisted into the object, so techniques like modifying the prototype won't work.
	
Now we have proxied the 'runner' object, we can spy on when it is called with the 'trap' function on the proxy:

	// Trap whenever someone calls 
	obj.run.trap(function myTrap(something){ 
		// when a client calls 'obj.run(...)', this is invoked first
		....
		// remove the trap (if necessary)
		myTrap.remove() ;
	}) ;

When the trap returns, the original function is invoked.

The mocking (currently) only applies to function members of the object (i.e. the exported calls), not data members. If you're interested in mocking data members let me know and I'll add the code for getters and settings.

Q. But what if I want to invoke the proxied function and check it's return value as part of my test? 
A. You can do that within your trap

	// Trap whenever someone calls 
	obj.run.trap(function myTrap(something){ 
		// when a client calls 'obj.run(...)', this is invoked first
		....
		// Call the unproxied function now, not on return
		var ret = myTrap.invoke() ;	
		....
		// remove the trap (if necessary)
		myTrap.remove() ;
	}) ;

Only one call to the original is made. You can call invoke() as many times as you want, but only the first is dispatched. Subsequent calls simply return the same value.

Q. But my trapped function has a callback (or other parameters) in it that I want to modify!
A. You can do that too - just pass the replacement values to invoke() as an array

	// Trap whenever someone calls 
	obj.run.trap(function myTrap(something){ 
		// when a client calls 'obj.run(...)', this is invoked first
		....
		// Call the unproxied function now with modified parameters, not on return
		var ret = myTrap.invoke([something+1,function(err,data){
			// Check to see that the original function made it to this callback (or whatever you need).
		}]) ;	
		....
		// remove the trap (if necessary)
		myTrap.remove() ;
	}) ;

Things to know...
- You can only proxy an object once (doing it more than once is harmless)
- You can add more than one trap() to a proxied function.

Pre-baked mocks
---------------
mocklib has some pre-baked mocks. You don't have to use them, but you can:

	mocklib.require('redis') ;	// Use fakeredis for redis

Let me know if you have a good mock module I should include.


Use with mocha
--------------

Here's an example mocha test script:

	var assert = require("assert");
	
	/* Important, load the mock objects now so that the tests get caught */
	var mocklib = require("mocklib") ;
	
	// Whenever the app asks for 'superlib', give it 'mock-superlib' instead.
	mocklib.mockModule(require("superlib"),require("mock-superlib")) ;
	
	var superLib = require("superlib") ; // We'll actually get mock-superlib	
	
	describe('check data flow', function() {
		// Before starting the tests, proxy 'reportParser'
		before(function(done){
	    	reportParser = mocklib.proxy(require('../src/parsers/reportParser'));
	    	done() ;
		});
		
		it('start the server',function(done){
	    	// Trap when the server tries to parse a report
	    	reportParser.parse.trap(function trap(reportName,callback){
	    		trap.invoke([reportName,function(err,data){
	    			assert(err || data) ;
	    			callback.apply(this,arguments) ;
	    			done() ;
	    		}) ;
	    	}) ;
	    	
	    	// Start the app - if all goes according to plan, it will
	    	// try to parse a report
	    	require('../main') ;
		});
	}) ;
