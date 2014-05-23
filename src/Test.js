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
		if(!route.isAlone()){
			this._runButton.setAttribute('disabled', 'disabled');
			this._listElement.className = 'running';
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
		if(!route.isAlone()){
			this.onFinish(false);
			this._listElement.className += ' timeout';
		}
	};
	

	Test.prototype.onFinish = function(passedState){
		this._runButton.removeAttribute('disabled');	
		this._listElement.className = passedState ? ' passed' : ' failed';
	};

	Test.prototype.createListElement = function(){
		this._listElement = document.createElement('dd');
		this._listElement.title = this._specFile;

		var a = document.createElement('a');
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

		return this._listElement;
	};

	Test.prototype.getListElement = function(){
		return this._listElement;
	};

	return Test;
});

