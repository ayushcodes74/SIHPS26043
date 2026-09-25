function calculatePriority({
    severity = 1,
    affectedPeople = 0,
    recurrence = 0,
    dependencyImportance = 0,
    daysUnresolved = 0,
    communitySupport = 0
}) {
    let numSeverity = 5;
    if (typeof severity === "number" && !isNaN(severity)) {
        numSeverity = severity;
    } else if (typeof severity === "string") {
        const s = severity.toUpperCase().trim();
        if (s === "CRITICAL") numSeverity = 9;
        else if (s === "HIGH") numSeverity = 8;
        else if (s === "MEDIUM") numSeverity = 6;
        else if (s === "LOW") numSeverity = 4;
        else {
            const parsed = parseInt(s, 10);
            if (!isNaN(parsed)) numSeverity = parsed;
        }
    }
    const severityScore = Math.min(Math.max(numSeverity, 1), 10) * 10;

    const affectedScore = Math.min(
        affectedPeople / 100,
        20
    );

    const recurrenceScore = Math.min(
        recurrence * 5,
        20
    );

    const dependencyScore = Math.min(
        dependencyImportance * 5,
        15
    );

    const unresolvedScore = Math.min(
        daysUnresolved / 2,
        15
    );

    const supportScore = Math.min(
        communitySupport * 0.5,
        10
    );

    const total =
        severityScore +
        affectedScore +
        recurrenceScore +
        dependencyScore +
        unresolvedScore +
        supportScore;

    return Math.min(
        Math.round(total),
        100
    );
}

module.exports = {
    calculatePriority
};