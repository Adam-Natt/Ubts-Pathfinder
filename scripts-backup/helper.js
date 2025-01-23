// Helper function to remove parenthesis from the string
function cutParenthesis(s) {
    const match = s.match(/\(([^)]+)\)/);
    return match ? match[1] : "No match found";
}

// Helper function to split the string by commas and convert the string array to a number array
function strToArray(str) {
    return str.replace(/\s+/g, '').split(',').map(Number);
}

// Helper function to remove whitespaces from a string
function removeWhitespace(str){
    let result = str.replace(/\s+/g, '');
    return result
}