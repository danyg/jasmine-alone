/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define([], function() {
	'use strict';

	function addClass(e, className){
		if(e.className.indexOf(className) === -1){
			e.className = e.className === '' ? className : e.className + ' ' + className;
		}
	}

	function removeClass(e, className){
		if(e.className.indexOf(className) !== -1){
			if(e.className === className){
				e.className = '';
			} else {
				var regx = new RegExp('[\\s]?' + className + '[\\s]?', 'g');
				e.className = e.className.replace(regx, '');
			}
		}
	}

	function isArray(o){
		// @todo TODO change this to be CrossBrowser and also accept OLD Browsers
		return Array.isArray(o);
	}


	function colorize(txt, baseColor){
		if(baseColor === undefined) {
			baseColor = '\u001b[0m';
		}

		return txt.replace(/PASSED/g, '\u001b[1;32mPASSED' + baseColor)
				.replace(/FAILED/g, '\u001b[1;31mFAILED' + baseColor)
				.replace(/SKIPPED/g, '\u001b[1;33mSKIPPED' + baseColor)
		;
	}

	function logError(msg){
		return (!!window.console && !!window.console.error ?
			window.console.error(msg) :
			window.alert(msg) // throw new error can breaks the execution
		);
	}

	function log(msg){
		function _log(msg) {
			return (!!window.console && !!window.console.log ?
				window.console.log(msg) :
				null
			);
		}
		if(!!window._phantom) {
			var eMsg = '';
				eMsg += '\n\n';
				eMsg += '\u001b[1;36m\n';
				eMsg += '<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n';
				eMsg += '\u001b[37mINFO: ';
				eMsg += '\n';
				eMsg += colorize(msg, '\u001b[37m');
				eMsg += '\n';
				eMsg += '\u001b[1;36m>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n';
				eMsg += '\n\u001b[0m'
			;
			if(window.PARTIAL_OUTPUT === 'ERROR') {
				setTimeout(function () {
					throw new Error(eMsg);
				},1);
			} else {
				_log(eMsg);
			}
		} else {
			_log(msg);
		}


	}

	function getPath(filePath) {
		var tmp = filePath.split('/');
		tmp.pop();
		return tmp.join('/');
	}

	return {
		addClass: addClass,
		removeClass: removeClass,
		isArray: isArray,
		log: log,
		logError: logError,

		getPath: getPath
	};
});