var Table = require('../index');
var table = new Table;
var test = require('tap');

test('the set column method',function(t){
    var el = document.createElement('div');
    table.to(el);
    t.equal(table.el, el);
    t.end();
});