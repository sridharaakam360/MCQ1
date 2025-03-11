/**
 * Safely converts a value to uppercase
 * @param {*} value - The value to convert
 * @returns {string} The uppercase string or empty string if invalid
 */
export const safeToUpperCase = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).toUpperCase();
};

/**
 * Safely capitalizes the first letter of a string
 * @param {*} value - The value to capitalize
 * @returns {string} The capitalized string or empty string if invalid
 */
export const safeCapitalize = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Safely gets the first character of a string
 * @param {*} value - The value to get first character from
 * @returns {string} The first character or empty string if invalid
 */
export const safeFirstChar = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).charAt(0).toUpperCase();
}; 