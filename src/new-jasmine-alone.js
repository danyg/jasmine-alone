/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define([
	'./main-runner',
	'./spec-alone-runner.js',
	'./route',
	'./utils',

	'css!jasmine-alone'
], function (
	mainRunner,
	specAloneRunner,
	route,
	utils
) {
	'use strict';

	var defaults = {
		TEST_EXECUTION_TIMEOUT: 60000,
		TEST_LOAD_TIMEOUT: 3000,
		MAX_THREADS: 5
	};

	var isolatedRunner = {
		run: function() {
			var runner;

			this.mainRunner = mainRunner;
			this.specAloneRunner = specAloneRunner;

			if(route.isAlone()) {
				runner = this.specAloneRunner;
				this.specAloneRunner.setSpecs([route.getCurrentSpecFile()]);
				this.specAloneRunner.setBeforeExecuteListeners(this._beforeExecuteTests);
			} else {
				runner = this.mainRunner;
				this.mainRunner.setBeforeExecuteListeners(this._beforeExecuteTests);
				this.mainRunner.setSpecs(this._getSpecs());
			}
			runner.init();

			runner.setDefaultReporter (
				!!window.runner ?
					window.runner :
					jasmine.getEnv().reporter.subReporters_[0]
			);

			if(!window._phantom) {
				runner.addViewReporter();
			}
			runner.run();
		},

		setSpecs: function(specsList) {
			this._specs = specsList;
		},

		_getSpecs: function(){
			if(!this._specs){
				var specs;
				if(!!window.specs && utils.isArray(window.specs)){
					specs = window.specs;
				}
				if(!!window.specFiles && utils.isArray(window.specFiles)){
					specs = window.specFiles;
				}

				// @todo TODO Improve this search to be more compatible with
				// diferents types of templates

				return specs;
			}else{
				return this._specs;
			}
		},

		beforeExecuteTests: function(cbk){
			if(undefined === this._beforeExecuteTests){
				this._beforeExecuteTests = [];
			}
			this._beforeExecuteTests.push(cbk);
		},

		defineDefault: function(propertyName) {
			if(undefined === window[propertyName]){
				window[propertyName] = defaults[propertyName];
			}else if(!isFinite(window[propertyName])){
				window[propertyName] = defaults[propertyName];
				utils.logError('JasmineAlone: ' + propertyName + ' is not a number. Defined an default value: ' + defaults[propertyName]);
			}
		}
	};


	isolatedRunner.defineDefault('TEST_EXECUTION_TIMEOUT');
	isolatedRunner.defineDefault('TEST_LOAD_TIMEOUT');
	isolatedRunner.defineDefault('MAX_THREADS');

	window.isolatedRunner = isolatedRunner;

	return isolatedRunner;
});