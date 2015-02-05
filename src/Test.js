/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define(['./route'], function(route){

	'use strict';

	function Test(specFile, handler){
		this._handler = handler;
		this._specFile = specFile;

		this.id = this._handler.specToId(specFile);
		this.src = route.getURLForSpec(this._specFile);

		this._listElement = null;

		this._lastReporter = null;
		this._lastChildRunner = null;
		this._passed = undefined;
	}

	Test.prototype.getId = function(){
		return this.id;
	};

	Test.prototype.getSpecFile = function(){
		return this._specFile;
	};

	Test.prototype.getSRC = function(){
		return this.src;
	};

	Test.prototype.getURL = function(){
		return this.src;
	};

	Test.prototype.run = function(){
		this._handler.getRunner().setCurrentTestObj(this);
		this._handler.getRunner().load();
	};

	Test.prototype.onRun = function(){
		this._timeOut = false;
		this._tS = Date.now();

		if(this.finished !== true){
			if(!route.isAlone()){
				this._runButton.setAttribute('disabled', 'disabled');
				this._listElement.className = 'running';
			}
		}
	};

	Test.prototype.getElement = function(){
		return this._listElement;
	};

	Test.prototype.markAsLoading = function(){
		if(!route.isAlone()){
			this._runButton.setAttribute('disabled', 'disabled');
			this._listElement.className += ' loading';
		}
	};

	Test.prototype.markAsTimeout = function(){
		this._timeOut = true;
		this._passed = undefined;
		if(!route.isAlone()){
			this.onFinish(false, true);
			this._listElement.className += ' timeout';
		}
	};

	Test.prototype.onFinish = function(passedState, internal){
		this._tE = Date.now();
		this._runButton.removeAttribute('disabled');
		this._listElement.className = passedState ? ' passed' : ' failed';
		if(!internal){
			this._passed = passedState;
		}

		if(!this._tS){
			this._timeCounter.innerHTML = ' (Not Executed)';
		} else {
			this._timeCounter.innerHTML = ' (' + (this._tE - this._tS) + 'ms)';
		}
		this.finished = true;
	};

	Test.prototype.createListElement = function(){
		this._listElement = document.createElement('dd');
		this._listElement.title = this._specFile;

		var a = document.createElement('a');
		this._timeCounter = document.createElement('span');
		this._timeCounter.className = 'time-counter';
		this._runButton = document.createElement('button'),

		this._runButton.innerHTML = 'Run';
		this._runButton.onclick = this.run.bind(this);

		a.href = route.getURLForSpec(this._specFile);

		var tmp = this._specFile.split('/');
		var baseName = tmp[tmp.length-1];
		baseName = baseName.replace('.js', '');
		baseName = baseName.replace('.spec', '');

		a.innerHTML = baseName;
		a.target = '_blank';

		this._listElement.appendChild(this._runButton);
		this._listElement.appendChild(a);
		this._listElement.appendChild(this._timeCounter);

		return this._listElement;
	};

	Test.prototype.getListElement = function(){
		return this._listElement;
	};

	Test.prototype.setReporter = function(reporter){
		this._lastReporter = reporter;
	};

	Test.prototype.getReporter = function(){
		return this._lastReporter;
	};

	Test.prototype.setChildRunner = function(childRunner){
		this._lastChildRunner = childRunner;
	};

	Test.prototype.getChildRunner = function(){
		return this._lastChildRunner;
	};

	Test.prototype.isPassed = function(){
		return this._passed;
	};

	Test.prototype.isTimeOut = function(){
		return this._timeOut;
	};

	return Test;
});
