exports.like = function(term, value, row) {
    return value.indexOf(term) > -1;
}
exports.is = function(term, value, row) {
    return term === value;
}