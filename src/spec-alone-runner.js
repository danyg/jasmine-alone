/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define([
	'./JARunner'
], function(
	JARunner
) {
	'use strict';

	function SpecAloneRunner() {
		JARunner.apply(this, arguments);
	}

	JARunner.augment(SpecAloneRunner);

	/**
	 * @Overwrite
	 */
	SpecAloneRunner.prototype.run = function() {
		this._markTime('loadingStart', this._route.getCurrentSpecFile());
		window.require(
			this._specs,
			this._onSpecLoaded.bind(this),
			this._requireErrorHandler.bind(this)
		);
	};

	SpecAloneRunner.prototype.setDefaultReporter = function() {
		jasmine.getEnv().reporter.subReporters_.splice(
			0,
			jasmine.getEnv().reporter.subReporters_.length
		);
		this._setReporter();
	};

	SpecAloneRunner.prototype._onSpecLoaded = function() {
		this._markTime('loadingStop', this._route.getCurrentSpecFile());
		if(!!this._parentRunner){
			this._parentRunner.onChildStart(this._route.getCurrentSpecFile());
		}
		this._executeBeforeExecuteTests();

		if(!!this._parentRunner) {
			var reporters = this.getParentReporters();
			for(var i = 0; i < reporters.length; i++) {
				jasmine.getEnv().addReporter(reporters[i]);
			}
		}

		this._executeJasmine();
	};

	SpecAloneRunner.prototype.getParentReporters = function() {
		if(!!this._parentRunner) {
			return this._parentRunner.getChildReporters(this._route.getCurrentSpecFile());
		}
		return false;
	};

	// *************************************************************************
	// PRIVATE METHODS
	// *************************************************************************

	/**
	 * @Overwrite
	 */
	SpecAloneRunner.prototype._prepare = function() {
		this._parentRunner = null;
		if (!!window.opener) {
			this._parentRunner = window.opener.isolatedRunner.mainRunner;
		}
	};

	/**
	 * @Overwrite
	 */
	SpecAloneRunner.prototype._onFinish = function() {
		this._markTime('testEnd', this._route.getCurrentSpecFile());

		if(!this._parentRunner){
			this._printReporter(this._internalReporter, this._route.getCurrentSpecFile());
		} else {
			this._parentRunner.onChildFinish(
				this._route.getCurrentSpecFile(),
				this._internalReporter,
				jasmine.getEnv().currentRunner()
			);
		}

		return this._onJasmineFinish.apply(jasmine.getEnv().currentRunner(), arguments);
	};

	SpecAloneRunner.prototype._requireErrorHandler = function(err) {
		var failedId = err.requireModules && err.requireModules[0],
			currentSpecFile = 'MAIN PROCESS';

		if(this._route.isAlone()) {
			currentSpecFile = this._route.getCurrentSpecFile();
		}

		throw new Error('Error Loading Dependencies in [' + currentSpecFile + '], dependencie not found: [' + failedId + ']');
	};

	/**
	 * @Override
	 */
	SpecAloneRunner.prototype.addViewReporter = function() {
		JARunner.prototype.addViewReporter.apply(this, arguments);
		this._viewReporter.toBody = true;
	};

	return new SpecAloneRunner();
});