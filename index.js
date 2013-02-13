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
    var filters = {};  // current filter functions to act upon dataset
    
    // public properties
    this.columns = [];
    this.data = [];
    this.el;
    this.$el;
    
    // public methods
    this.setColumns = function( columns ) {
        this.columns = columns;
        setColumnWidths();
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
        $table = $('<div>',{ 'class': 'bland-table' }).appendTo( this.$el );
        $thead = $('<div>',{ 'class': 'thead' }).appendTo( $table );
        $header_row = $('<div>',{ 'class': 'tr' }).appendTo( $thead );
        $filter_row = $('<div>',{ 'class': 'tr' }).appendTo( $thead );
        $tbody = $('<div>',{ 'class': 'tbody' }).appendTo( $table );
        initIfReady();
    }
    this.init = function() {
        render();
        set_listeners();
    }
    
    // private methods
    var initIfReady = function() {
        if ( self.el && self.columns.length ) self.init();
    }
    var setColumnWidths = function() {
        var totalWidth = 100;
        var makeDefault = [];
        self.columns.forEach(function(column, key){
            if (column.width !== undefined) totalWidth -= column.width;
            else makeDefault.push(column);
        });
        var defaultWidth = Math.floor( (totalWidth/makeDefault.length) * 100) / 100 ;
        makeDefault.forEach(function(column, key){
            column.width = defaultWidth;
        });
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
    var create_header = function(column) {
        // make el
        var $th = $('<div>',{'class':'th col-'+column.id, 'style': 'width:'+column.width+'%;'});
        var label = column.label || column.id;
        label = label.split(" ").join("&nbsp;");


        if (column.sort) {
            label = '<a href="#" class="sortlabel">'+label+'</a><a href="#" class="resize"></a>';
            $th.html('<div class="cell-inner">'+label+'</div>');
            $th.on("click",".sortlabel",function(evt){
                var class_to_add = $th.hasClass("desc") ? "asc" : "desc" ;
                var key = class_to_add.charAt(0);
                $header_row.find(".th").removeClass("asc desc").find('.asc-icon,.desc-icon').remove();
                $th.addClass(class_to_add);
                $th.find("cell-inner").prepend('<i class="'+class_to_add+'-icon"></i> ');
                self.data.sort(column.sort[key]);
                render_rows();
            });
        }
        else {
            $th.html('<div class="cell-inner">'+label+'</div>');
        }
        
        var mouseX = 0;
        var mousemove = function(evt) {
            var tbl_width = $table.width();
            var percent = ((this.col_width + evt.clientX - mouseX) / tbl_width ) * 100;
            column.width = percent;
            $(".col-"+column.id, $table).css('width',percent+'%');
        }
        var mouseup = function(evt) {
            $table.off("mousemove");
            $table.off("mouseup");
            $table.off("mouseout");
        }
        var cleanup = function(evt) {
            $table.off("mousemove");
            $(".th, tr, thead",$table).on("mouseout");
        }
        $th.on("mousedown",".resize",function(evt){
            evt.preventDefault();
            var col_width = $th.width();
            mouseX = evt.clientX;
            $table.on("mousemove", mousemove.bind({col_width:col_width}));
            $(window).one("mouseup",cleanup);
        });
        
        return $th;
    }
    var create_filter = function(column) {
        var $td = $('<div class="td col-'+column.id+'" style="width:'+column.width+'%;"><div class="cell-inner"></div></div>');
        var filter = false;
        switch ( typeof column.filter ) {
            case "function":
                filter = column.filter;
            break;
            case "string":
                filter = filterFunctions[column.filter] || false;
            break;
        }
        if (filter === false) return $td;
        
        // add filter field
        var placeholder = column.placeholder || 'filter';
        var $filter = $('<input>',{ 'class': 'filter', 'type':'search','placeholder':placeholder });
        var searchVal = '';
        $filter.on("keyup click",function(evt){
            var term = $.trim(this.value);
            if (term == searchVal) return;
            searchVal = term;
            remove_filter(column.id);
            if (term) add_filter(column.id, filter, term);
        });
        $filter.appendTo($td.find(".cell-inner"));
        return $td;
    }
    var add_filter = function(id, filterFn, term) {
        filters[id] = { fn: filterFn, term: term };
        render_rows();
    }
    var remove_filter = function(id) {
        delete filters[id];
        render_rows();
    }
    var render_rows = function() {
        $tbody.empty();
        for (var i = 0; i < self.data.length; i++) {
            var $row = create_row(self.data[i]);
            if ($row instanceof $) $row.appendTo($tbody);
        }
    }
    var create_row = function(rowdata) {
        var rowHtml = '<div class="tr">';
        for ( var k = 0; k < columns.length; k++) {
            // get column object
            var column = columns[k];
            // get value to display
            var cell_value = ( typeof column.format === "function" ) ? column.format(rowdata) : rowdata[column.format] ;
            // check for filter
            if (filters.hasOwnProperty(column.id)) {
                if ( ! filters[column.id].fn( filters[column.id].term , cell_value, rowdata ) ) return;
            }
            rowHtml += '<div class="td col-'+column.id+'" style="width:'+column.width+'%;"><div class="cell-inner">'+cell_value+'</div></div>';
        }
        rowHtml += '</div>';
        return $(rowHtml);
    }
    var set_listeners = function() {
        
    }

}
exports = module.exports = BlandTable;