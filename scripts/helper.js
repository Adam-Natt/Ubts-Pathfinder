/**
 * Removes parentheses from a string and extracts the content within them.
 * @param {string} s - The input string containing parentheses.
 * @returns {string} The content inside the parentheses, or "No match found" if none exist.
 */
function cutParenthesis(s) {
    const match = s.match(/\(([^)]+)\)/); // Extract content within parentheses
    return match ? match[1] : "No match found"; // Return the matched content or a default message
}

/**
 * Converts a comma-separated string into an array of numbers.
 * @param {string} str - The input string (e.g., "123, 456, 789").
 * @returns {Array<number>} An array of numbers (e.g., [123, 456, 789]).
 */
function strToArray(str) {
    return str.replace(/\s+/g, '') // Remove all whitespace
              .split(',')          // Split the string by commas
              .map(Number);        // Convert each string to a number
}

/**
 * Removes all whitespace from a string.
 * @param {string} str - The input string.
 * @returns {string} The string without any whitespace.
 */
function removeWhitespace(str) {
    return str.replace(/\s+/g, ''); // Replace all whitespace characters with an empty string
}
