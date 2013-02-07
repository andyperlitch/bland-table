Bland Table
===========

Node module for creating interactive html tables.

## Usage

    var options = {
        // table options, TBD
    }
    var columns = [
        {
            id: "row_id"  // required: unique for only this column (String)
            format: "id", // required: function for calculated cell value or key of data obj (String or Function)
            label: "Row ID", // optional: label for th, if absent, id used (String)
            filter: function(term, value) { return value == term } , // optional: will add a filter field to top of column
            sort: { 
                a: function(row1,row2) { return row1.id <= row2.id }, 
                d: function(row1,row2) { return row1.id >= row2.id },
                start: "a"
            }
        },
        {
            id: "name",
            format: function(row) { return row.first + " " + row.last },
            label: "Full Name",
            filter: function(term, value, row) { return value.indexOf(term) > -1 },
            sort: {
                a: function(row1,row2) { return row1.b > row.a },
                d: function(row1,row2) { return row1.b < row.a }
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
    var Table = require("./lib");
    var table = new Table;
    
    table.setColumns(columns);
    table.setData(rows);
    table.to(document.getElementById("my-table"));
    
    // after changes made to rows...
    table.update();
    // to update entire dataset
    table.setData(new_rows);
    // to update columns
    table.setColumns(new_columns);


## Requirements

- order-able columns, asc or desc
- resizable columns
    - resize on double-click right edge
- filter fields
- format functions for cells
- updatable data
