/**
 * Parses and validates a pagination limit.
 * Enforces a hard maximum and ensures the value is a positive integer.
 * 
 * @param {string|number} rawLimit - The requested limit
 * @param {number} defaultLimit - The default limit if invalid/unspecified
 * @param {number} maxLimit - The hard maximum limit allowed
 * @returns {number} The validated limit
 */
const parseLimit = (rawLimit, defaultLimit = 50, maxLimit = 1000) => {
    let limit = parseInt(rawLimit, 10);
    if (isNaN(limit) || limit <= 0) {
        limit = defaultLimit;
    }
    return Math.min(limit, maxLimit);
};

/**
 * Parses and validates a pagination page/offset.
 * 
 * @param {string|number} rawPage - The requested page number
 * @returns {number} The validated page number (min 1)
 */
const parsePage = (rawPage) => {
    let page = parseInt(rawPage, 10);
    if (isNaN(page) || page <= 0) {
        page = 1;
    }
    return page;
};

module.exports = {
    parseLimit,
    parsePage
};
