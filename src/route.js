/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define([], function(){

	'use strict';

	function s(){
		return window.location.search.toString();
	}

	var route = {

		getCurrentSpecFile: function(){
			var m = s().match(/[?&]specFile=([^&]*)/);
			return (m !== null && !!m[1]) ? decodeURIComponent(m[1]) : false;
		},

		getURLForSpec: function(specFile){
			var l = window.location;
			return l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') + l.pathname +
				'?specFile=' + encodeURIComponent(specFile)
			;
		},

		isWholeSuite: function(){
			return s().match(/[?&]whole/) !== null;
		},

		isAlone: function(){
			return s().match(/[?&]specFile=/) !== null;
		},

		isAutoStart: function(){
			return (undefined !== window.ISOLATED_AUTOSTART) ?
				window.ISOLATED_AUTOSTART :
				s().match(/[?&]autostart=false/) === null
			;
		}
	};

	return route;
});