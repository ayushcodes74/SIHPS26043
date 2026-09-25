/**
 * Safely parse problem ID.
 * Accepts numbers (42), string integers ("42"), and prefixed IDs ("prob-042", "prob-101").
 * Returns a valid ID or null if invalid/empty.
 */
function parseProblemId(raw) {
    if (raw === undefined || raw === null) return null;
    const str = String(raw).trim();
    if (!str) return null;

    // Pure number
    if (/^\d+$/.test(str)) {
        return parseInt(str, 10);
    }

    // Prefixed like prob-042 or chal-101 -> extract number
    const match = str.match(/\d+/);
    if (match) {
        return parseInt(match[0], 10);
    }

    return str;
}

module.exports = {
    parseProblemId
};
