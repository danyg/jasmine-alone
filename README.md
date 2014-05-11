Jasmine Alone
=============

A jasmine tool to run the specs in an isolated way.

## Introduction
The Jasmine Developers says that is responsability to the developer clean the context 
for the next tests, that is an excelent idea, in an ideal world, but sometimes is 
really complex to mantain that approach, in big teams and in some kind of project based on
certains frameworks.
When the needed effort to clean the environment is so big that is easier to not test something
there is when is really needed to isolate the tests.
Because of that I was create this tool.

This tool is intented to be a transparent tool that can be added to an existing jasmine
test suite, in order to run the specs isolated.
Every spec file will be executed as the only one in the suite. This a different approach that
Jasmine now really does, when you click in one test and this is loaded as "alone", because the
rest of specs are loaded with all this code inside.

## Real world cases

When you need to test...
- Code that dependends on navigation
- Code that dependends on singletons provided by a framework that mantain some states
- When your beforeEach and afterEach has more code that your application
- Exception scenarios, system recover scenearios, when you want to test missing libraries, broken modules etc...

In all this cases, with some time you will find a solution, stabing, spying etc... BUT
in a production application with deadlines and this kind of "realities" sometimes you don't have
the required time to dedicate to CLEAN YOUR TEST ENVIRONMENT there is when this tool can be
really usable.

# How To use

...