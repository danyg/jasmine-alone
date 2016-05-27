/*
 *
 *  @overview
 *  @author Daniel Goberitz <dalgo86@gmail.com>
 *
 */

define([], function(){
	'use strict';

	function printReporter(reporter) {
		var txt = '';

		if (reporter === undefined) {
			reporter = window.reporter;
		}


		if (!!reporter) {
			var results = reporter.results();
			var suites = reporter.suites();
			var i;

			for (i in suites) {
				if (suites.hasOwnProperty(i)) {
					txt += printSuite(suites[i], results) + '\n';
				}
			}

			var passed = 0, failed = 0, total = 0;
			for (i in results) {
				if (results.hasOwnProperty(i)) {
					total++;
					if (results[i].result === 'passed') {
						passed++;
					} else {
						failed++;
					}
				}
			}
			txt += '\n\n TOTAL: ' + total + ' | Failed: ' + failed + ' | Passed: ' + passed;
		}
		return txt;
	}
	printReporter.PASSMARK = '[ \u2714 ]';
	printReporter.SKIPMARK = '[ \u25CF ]';
	printReporter.FAILMARK = '[ \u0078 ]';

	function printSuite(suite, results, tabs) {
		var tabChar = '    ',
			mark,
			rmark,
			i,
			m,
			txt,
			skipped = false
		;

		if (undefined === tabs) {
			tabs = tabChar;
		}

		var result = results[suite.id];
		if (!!result) {
			skipped = 'spec' === suite.type && result.result === 'passed' && result.messages.length === 0;

			mark = skipped ? printReporter.SKIPMARK :
				result.result === 'passed' ?
					printReporter.PASSMARK :
					printReporter.FAILMARK
			;
			txt = mark + ' ' + suite.name;

			if (result.result !== 'passed') {
				for (i in result.messages) {
					if (result.messages.hasOwnProperty(i)) {
						m = result.messages[i];
						rmark = (
							m.passed_ ?
								printReporter.PASSMARK :
								m.skipped ?
									printReporter.SKIPMARK :
									printReporter.FAILMARK
						);

						if(!m.passed_) {
							txt += '\n' + tabs + rmark + ' ' + m.message;
						} else {
							txt += '\n' + tabs + rmark + ' ';
							if(m.actual === undefined && m.matcherName  === undefined && m.expected === undefined) {
								txt += m.message;
							} else {
								txt += m.type + ' ' + m.actual + ' ' + m.matcherName + ' ' + m.expected;
							}
						}
					}
				}
			}

			for (i in suite.children) {
				if (suite.children.hasOwnProperty(i)) {
					txt += '\n' + tabs + printSuite(suite.children[i], results, tabs + tabChar);
				}
			}

			return txt;
		} else {
			return printReporter.SKIPMARK + ' ' + suite.name;

		}
	}

	return printReporter;
});
