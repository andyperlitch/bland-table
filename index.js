var filterFunctions = require('./lib/filterFunctions');
var BlandTable = function() {
    
    // private properties
    var self = this;
    var $table;
    var $thead;
    var $header_row;
    var $filter_row;
    var $tbody;
    var columns = [];  // private copies of columns
    var filters = {}; // current filter functions to act upon dataset
    
    // public properties
    this.columns = [];
    this.data = [];
    this.el;
    this.$el;
    
    // public methods
    this.setColumns = function( columns ) {
        this.columns = columns;
        initIfReady();
    }
    this.setData = function( data ) {
        this.data = data;
        initIfReady();
    }
    this.to = function( el ) {
        this.el = el;
        this.$el = $(el);
        
        // set up base elements
        $table = $('<table>',{ 'class': 'bland-table' }).appendTo( this.$el );
        $thead = $('<thead>').appendTo( $table );
        $header_row = $('<tr>').appendTo( $thead );
        $filter_row = $('<tr>').appendTo( $thead );
        $tbody = $('<tbody>').appendTo( $table );
        
        initIfReady();
    }
    this.init = function() {
        render();
    }
    
    // private methods
    var initIfReady = function() {
        if ( self.el && self.columns.length ) self.init();
    }
    var render = function() {
        // check that columns and $el is set
        if (!self.columns.length || !self.$el.length ) return;
        render_headers();
        render_rows();
    }
    var render_headers = function() {
        // have changes occurred?
        if (self.columns == columns) return;
        columns = self.columns.slice();
        // yes. empty rows and generate new ones.
        $header_row.empty();
        $filter_row.empty();
        for (var k = 0; k < columns.length; k++) {
            create_header(columns[k]).appendTo($header_row);
            create_filter(columns[k]).appendTo($filter_row);
        }
        self.columns = columns;
    }
    var render_rows = function() {
        $tbody.empty();
        for (var i = 0; i < self.data.length; i++) {
            var $row = create_row(self.data[i]);
            if ($row instanceof $) $row.appendTo($tbody);
        }
    }
    
    // creates th element with sort listeners,
    // if specified by column object
    var create_header = function(column) {
        var $th = $('<th>',{'class':'th'});
        var label = column.label || column.id;
        if (column.sort) {
            label = '<a href="#" class="sortlabel">'+label+'</a><a href="#" class="resize"></a>';
        }
        $th.html(label);
        return $th;
    }
    // creates td element with filter field, 
    // if specified by column object
    var create_filter = function(column) {
        var $td = $('<td>');
        var filter = false;
        switch ( typeof column.filter ) {
            case "function":
                filter = column.filter;
            break;
            case "string":
                filter = filterFunctions[column.filter] || false;
            break;
        }
        $.data($td[0],'filter',filter);
        if (filter === false) return $td;
        
        // add filter field
        var placeholder = column.placeholder || 'filter';
        var $filter = $('<input type="search" placeholder="'+placeholder+'" />');
        var searchVal = '';
        $filter.on("keyup",function(evt){
            var term = $.trim(this.value);
            if (term == searchVal) return;
            searchVal = term;
            remove_filter(column.id);
            if (term) add_filter(column.id, filter, term);
        });
        $filter.appendTo($td);
        return $td;
    }
    // takes column id and filter function and
    // filters rendered rows down to those that match.
    var add_filter = function(id, filterFn, term) {
        filters[id] = { fn: filterFn, term: term };
        render_rows();
    }
    var remove_filter = function(id) {
        delete filters[id];
        render_rows();
    }

    var create_row = function(rowdata) {
        var rowHtml = '<tr>';
        for ( var k = 0; k < columns.length; k++) {
            // get column object
            var column = columns[k];
            // get value to display
            var cell_value = ( typeof column.format === "function" ) ? column.format(rowdata) : rowdata[column.format] ;
            // check for filter
            if (filters.hasOwnProperty(column.id)) {
                if ( ! filters[column.id].fn( filters[column.id].term , cell_value, rowdata ) ) return;
            }
            rowHtml += '<td>'+cell_value+'</td>';
        }
        rowHtml += '</tr>';
        return $(rowHtml);
    }
    

}
exports = module.exports = BlandTable;