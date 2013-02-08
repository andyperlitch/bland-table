var Table = require('../../index');
var table = new Table;
var columns = [
    {
        id: "row_id",  // required: unique for only this column (String)
        label: "Row ID", // optional: label for th, if absent, id used (String)
        format: "id", // required: function for calculated cell value or key of data obj (String or Function)
        filter: function(term, value) { return value == term } , // optional: will add a filter field to top of column
        sort: { 
            a: function(row1,row2) { return row1.id <= row2.id }, 
            d: function(row1,row2) { return row1.id >= row2.id },
            start: "a"
        }
    },
    {
        id: "name",
        label: "Full Name",
        format: function(row) { return row.first + " " + row.last },
        filter: function(term, value, row) { return value.indexOf(term) > -1 },
        sort: {
            a: function(row1,row2) { return row1.first < row2.first },
            d: function(row1,row2) { return row1.first > row2.first }
        }
    }
];
var rows = [
    { "id": 1, "first": "andy", "last": "perlitch" },
    { "id": 2, "first": "joe", "last": "shmoe" },
    { "id": 3, "first": "harry", "last": "dunn" },
    { "id": 4, "first": "lloyd", "last": "christmas" },
    { "id": 5, "first": "mary", "last": "swanson" },
];

$(document).ready(function(){
    table.setColumns(columns);
    table.setData(rows);
    table.to(document.getElementById("my-table"));
});

