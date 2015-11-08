/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define([
	'./route',
	'./jasmine-html-isolated',
	'./utils',
	'./printer'
], function(
	route,
	HtmlReporter,
	utils,
	printReporter
) {
	'use strict';

	function JARunner() {
		this._route = route;
		this._specs = null;
		this._beforeExecuteTests = null;

		this._timeForSpecFile = {};
		this._viewReporter = null;
	}

	JARunner.prototype.init = function() {
		if(!this._route.isWholeSuite()) {
			this._hackJasmine();
			this._prepare();
		}
	};

	/**
	 * Sets the specs list from outside if is necessary
	 *
	 * @param {Array.<String>} specsList
	 */
	JARunner.prototype.setSpecs = function(specsList){
		this._specs = specsList;
	};

	JARunner.prototype.addViewReporter = function() {
		this._viewReporter = new HtmlReporter();
		jasmine.getEnv().addReporter(this._viewReporter);
	};

	// *************************************************************************
	// PRIVATE Methods
	// *************************************************************************

	/**
	 * Prevents to jasmine be executed by the default Runner
	 */
	JARunner.prototype._hackJasmine = function() {
		this._executeJasmine = jasmine.getEnv().execute.bind(jasmine.getEnv());
		jasmine.getEnv().execute = function(){};

		this._onJasmineFinish = jasmine.getEnv().currentRunner().finishCallback;
		var me = this;
		jasmine.getEnv().currentRunner().finishCallback = function (){
			me._onFinish();
		};

		this._setReporter();
	};

	JARunner.prototype._setReporter = function() {
		this._internalReporter = new jasmine.JsApiReporter();
		jasmine.getEnv().addReporter(this._internalReporter);
	};

	JARunner.prototype.beforeExecuteTests = function(cbk) {
		if(undefined === this._beforeExecuteTests){
			this._beforeExecuteTests = [];
		}
		this._beforeExecuteTests.push(cbk);
	};

	JARunner.prototype.setBeforeExecuteListeners = function(listeners) {
		this._beforeExecuteTests = listeners;
	};

	JARunner.prototype._executeBeforeExecuteTests = function() {
		if(!!this._beforeExecuteTests && this._beforeExecuteTests.length > 0){
			var i, cbk;
			for(i = 0; i < this._beforeExecuteTests.length; i++){
				cbk = this._beforeExecuteTests[i];
				if(!!cbk && !!cbk.constructor && cbk.constructor.name.toLowerCase() === 'function'){
					try{
						cbk.call();
					}catch(e){
						utils.logError(e);
					}
				}
			}
		}
	};

	JARunner.prototype._printReporter = function(reporter, specFile){
		var extra = '';
		if(specFile) {
			extra += '\n ' + specFile;
			extra += '\n Tests executed in: ' + this._getTimeDiff(specFile, 'testEnd', 'loadingStop');
			extra += '\n Total time: ' + this._getTimeDiff(specFile, 'testEnd', 'loadingStart');
		}
		utils.log( printReporter(reporter) + extra);
	};

	JARunner.prototype._markTime = function (timeKey, specFile) {
		if(!this._timeForSpecFile.hasOwnProperty(specFile)){
			this._timeForSpecFile[specFile] = {};
		}
		this._timeForSpecFile[specFile][timeKey] = Date.now();
	};

	JARunner.prototype._getTimeDiff = function (specFile, timeKeyA, timeKeyB){
		if(!this._timeForSpecFile.hasOwnProperty(specFile)){
			return 0;
		}
		var timeA = this._timeForSpecFile[specFile][timeKeyA];
		var timeB = this._timeForSpecFile[specFile][timeKeyB];

		return (timeA - timeB).toString() + 'ms';
	};

	// *************************************************************************
	// HOOKS (to be overwrited)
	// *************************************************************************
	JARunner.prototype.run = function() {};
	JARunner.prototype.getExternalReporter = function() {};
	JARunner.prototype._onFinish = function() {};
	JARunner.prototype._prepare = function() {};
	JARunner.prototype.setDefaultReporter = function(/*reporter*/) {};

	JARunner.augment = function augment(ctor) {
		if (ctor === undefined || ctor === null) {
			throw new TypeError(
				'The constructor to `inherits` must not be null or undefined.'
			);
		}

		ctor._super = JARunner;
		ctor.prototype = Object.create(JARunner.prototype, {
			constructor : {
				value : ctor,
				enumerable : false,
				writable : true,
				configurable : true
			}
		});
	};

	return JARunner;
});