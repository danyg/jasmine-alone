#!/bin/sh
grunt build
cp ./dist/jasmine-alone.js /scrumdata/workspaces/workspace-kepler/cbs-payments-web-parent/cbs-payments-web/src/test/jasmine/js/
echo "Copyed!";
