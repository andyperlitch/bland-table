all:
	browserify ./examples/simple1/start.js -o ./examples/simple1/js/bundle.js
	lessc ./blandtable.less ./blandtable.css