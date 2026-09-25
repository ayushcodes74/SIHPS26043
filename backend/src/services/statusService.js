const STATUS_FLOW = {
    REPORTED: [
        "UNDER_REVIEW",
        "VERIFIED",
        "SOLUTION_SEARCH",
        "SOLUTION_EVALUATION",
        "APPROVED",
        "EXECUTION_SUBMITTED",
        "CLOSED",
        "RESOLVED"
    ],

    UNDER_REVIEW: [
        "VERIFIED",
        "REPORTED",
        "SOLUTION_SEARCH",
        "SOLUTION_EVALUATION",
        "APPROVED",
        "EXECUTION_SUBMITTED",
        "CLOSED",
        "RESOLVED"
    ],

    VERIFIED: [
        "ASSIGNED",
        "SOLUTION_SEARCH",
        "SOLUTION_EVALUATION",
        "APPROVED",
        "EXECUTION_SUBMITTED",
        "CLOSED",
        "RESOLVED"
    ],

    ASSIGNED: [
        "ROOT_CAUSE_ANALYSIS",
        "SOLUTION_SEARCH",
        "SOLUTION_EVALUATION",
        "APPROVED",
        "EXECUTION_SUBMITTED",
        "CLOSED",
        "RESOLVED"
    ],

    ROOT_CAUSE_ANALYSIS: [
        "SOLUTION_SEARCH",
        "SOLUTION_EVALUATION",
        "APPROVED",
        "EXECUTION_SUBMITTED",
        "CLOSED",
        "RESOLVED"
    ],

    SOLUTION_SEARCH: [
        "SOLUTION_EVALUATION",
        "APPROVED",
        "EXECUTION_SUBMITTED",
        "CLOSED",
        "RESOLVED"
    ],

    SOLUTION_EVALUATION: [
        "APPROVED",
        "SOLUTION_SEARCH",
        "EXECUTION_SUBMITTED",
        "CLOSED",
        "RESOLVED"
    ],

    APPROVED: [
        "EXECUTION_SUBMITTED",
        "CLOSED",
        "RESOLVED",
        "VERIFIED"
    ],

    EXECUTION_SUBMITTED: [
        "CLOSED",
        "RESOLVED",
        "APPROVED"
    ],

    RESOLVED: [
        "CLOSED",
        "EXECUTION_SUBMITTED"
    ],

    CLOSED: []
};

function isValidTransition(currentStatus, newStatus) {
    if (!currentStatus || !newStatus) return false;
    if (currentStatus === newStatus) return true;
    return STATUS_FLOW[currentStatus]?.includes(newStatus) || false;
}

module.exports = {
    STATUS_FLOW,
    isValidTransition
};