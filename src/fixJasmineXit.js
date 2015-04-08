define([], function(){
	'use strict';

	var oldIt = jasmine.Env.prototype.it;
	var oldDescribe = jasmine.Env.prototype.describe;
	var oldBeforeEach = jasmine.Env.prototype.beforeEach;
	var oldAfterEach = jasmine.Env.prototype.afterEach;

	jasmine.Env.prototype.it = function (description, fnc) {
		if(!!this.currentSuite && this.currentSuite.skipped){
			return this.xit(description, fnc);
		} else {
			return oldIt.apply(this, arguments);
		}
	};

	jasmine.Env.prototype.beforeEach = function(){
		if(!!this.currentSuite && this.currentSuite.skipped){
			return;
		} else {
			return oldBeforeEach.apply(this, arguments);
		}
	};

	jasmine.Env.prototype.afterEach = function(){
		if(!!this.currentSuite && this.currentSuite.skipped){
			return;
		} else {
			return oldAfterEach.apply(this, arguments);
		}
	};

	jasmine.Env.prototype.xit = function (description) {
		var spec = new jasmine.Spec(this, this.currentSuite, description);
		this.currentSuite.add(spec);
		this.currentSpec = spec;

		spec.runs(function(){
			spec.skipped = true;
		});

		return spec;
	};

/*
	jasmine.Env.prototype.describe = function(description, specDefinitions){
		if(!!this.currentSuite && this.currentSuite.skipped){
			return this.xdescribe(description, specDefinitions);
		} else {
			return oldDescribe.apply(this, arguments);
		}
	};

	jasmine.Env.prototype.xdescribe = function(description, specDefinitions){
	  var suite = new jasmine.Suite(this, description, specDefinitions, this.currentSuite);
	  suite.skipped = true;

	  var parentSuite = this.currentSuite;
	  if (parentSuite) {
	    parentSuite.add(suite);
	  } else {
	    this.currentRunner_.add(suite);
	  }

	  this.currentSuite = suite;

	  var declarationError = null;
	  try {
	    specDefinitions.call(suite);
	  } catch(e) {
	    declarationError = e;
	  }

	  if (declarationError) {
	    this.it("encountered a declaration exception", function() {
	      throw declarationError;
	    });
	  }

	  this.currentSuite = parentSuite;

	  return suite;
	};
*/

});