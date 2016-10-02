install:
	npm install

develop:
	DEBUG="hexlet-phonebook" npm run develop

lock:
	npm shrinkwrap

build:
	rm -rf dist
	npm run build

test:
	DEBUG="hexlet-phonebook" npm run test

lint:
	npm run eslint -- src test

publish:
	npm publish

.PHONY: test
