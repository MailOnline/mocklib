/* Mock a redis server */
var mocklib = require("../mocklib") ;

// Load the module so all other loads refer to the fakeredis
var redis = require("redis");
var fakeredis = require("fakeredis") ;
// Where we meant to use the module 'redis', use 'fakeredis' instead
mocklib.mockModule(redis,fakeredis) ;

// Our mocked redis (fakedredis) has an additional method
// to create a duplicate of a redis connection, so that, for
// example, a connection in subscription mode can be duplicated 
// to allow publishing to the same 'client'
var superCreateClient = fakeredis.createClient ;
fakeredis.createClient = function(){
	var self = this ;
	var args = arguments ;
	function createClient(){
		return superCreateClient.apply(self,args) ;
	}
	var client = createClient() ;
	client._mock = {
		cloneClient:createClient
	}
	return client ;
}

module.exports = fakeredis ;
