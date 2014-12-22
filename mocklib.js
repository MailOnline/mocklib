/**
 * Utilities for creating and managing mocks (object proxies)
 */

/**
 * Include one of our pre-baked mocks
 */

function requireMock(name) {
	return require("./mocks/"+name) ;
}

/**
 * Replace the original module in the nodejs Module cache with the specified mock.
 * All subsequent references to the original will now return the mock.
 */
function mockModule(original, mock) {
	var moduleCache = module.constructor._cache ;
	Object.keys(moduleCache).forEach(function(path){
		if (moduleCache[path].exports==original) {
			moduleCache[path].exports = mock ;
		}
	}) ;
}

/**
 * proxy all the functions in the specified object. The object reference itself is 
 * unmodified, but all the functions are caught (does not apply to prototypical
 * members) and can be individually trapped. For example, consider proxying an object
 * with a functional member called 'run', once proxied, we can call:
 * 
 * obj.run.trap(function myTrap(...){ 
 * 		// when a client calls 'obj.run(...)', this is invoked first
 * 		....
 * 		// remove the trap (if neessary)
 * 		myTrap.remove() ;
 * }) ;
 * 
 * @param o		The object to proxy
 * @returns
 */
function proxy(o){
	if (!o._proxyTarget) {
		var m = {} ;
		Object.keys(o).forEach(function(k){
			if (typeof o[k]==='function') {
				m[k] = {unmocked:o[k],traps:[]} ;
				o[k] = function() {
					var self = this ;
					var args = arguments ;
					var invoke = function(replaceArgs) {
						var replaceArgs = replaceArgs || args ;
						var ret = m[k].unmocked.apply(self,replaceArgs) ;
						this.invoke = invoke = function() { return ret ; } ;
						return ret ;
					}
					m[k].traps.forEach(function(trap){
						trap.invoke = invoke.bind(trap) ;
						trap.apply(self,args) ;
					}) ;
					return invoke.apply({}) ;
				}
				o[k].trap = function(fn) {
					m[k].traps.unshift(fn) ;
					fn.remove = function() {
						m[k].traps = m[k].traps.filter(function(t){ return t!=fn; }) ;
					}
				}
			} else {
				m[k] = o[k] ;
			}
		}) ;
		// Unconfigurable, unwritable
		Object.defineProperty(o,"_proxyTarget",{value:m});
	}
	return o ;
}


module.exports = {
	mockModule:mockModule,
	proxy:proxy,
	require:requireMock
}
