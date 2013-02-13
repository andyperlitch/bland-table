(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process,global){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process,global){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {}
});

require.define("/index.js",function(require,module,exports,__dirname,__filename,process,global){var filterFunctions = require('./lib/filterFunctions');
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
        var $th = $('<div>',{'class':'th col-'+column.id, 'style': 'width:'+column.width+'%;'});
        var label = column.label || column.id;
        label = label.split(" ").join("&nbsp;");
        var mouseX = 0;
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
});

require.define("/lib/filterFunctions.js",function(require,module,exports,__dirname,__filename,process,global){exports.like = function(term, value, row) {
    return value.indexOf(term) > -1;
}
exports.is = function(term, value, row) {
    return term === value;
}
});

require.define("/examples/simple1/start.js",function(require,module,exports,__dirname,__filename,process,global){var Table = require('../../index');
var table = new Table;
var columns = [
    {
        id: "row_id",  // required: unique for only this column (String)
        label: "Row ID", // optional: label for th, if absent, id used (String)
        format: "id", // required: function for calculated cell value or key of data obj (String or Function)
        filter: function(term, value) { return value == term } , // optional: will add a filter field to top of column
        sort: { 
            a: function(row1,row2) { return row1.id >= row2.id }, 
            d: function(row1,row2) { return row1.id <= row2.id },
            start: "a"
        },
        width: 10
    },
    {
        id: "name",
        label: "Full Name",
        format: function(row) { return row.first + " " + row.last },
        filter: function(term, value, row) { return value.indexOf(term) > -1 },
        sort: {
            a: function(row1,row2) { return row1.first > row2.first },
            d: function(row1,row2) { return row1.first < row2.first }
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


});
require("/examples/simple1/start.js");
})();
