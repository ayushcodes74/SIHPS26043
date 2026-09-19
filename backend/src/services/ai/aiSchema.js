/**
 * Normalized schema for AI Challenge Intelligence and Explainable Matching.
 */

const VALID_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const VALID_URGENCIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function normalizeAIResponse(raw, provider, mode) {
    if (!raw || typeof raw !== "object") {
        throw new Error("Invalid AI response: Must be a JSON object.");
    }

    const normalized = {
        domain: String(raw.domain || ""),
        subdomain: String(raw.subdomain || ""),
        severity: VALID_SEVERITIES.includes(String(raw.severity).toUpperCase()) 
            ? String(raw.severity).toUpperCase() : "MEDIUM",
        urgency: VALID_URGENCIES.includes(String(raw.urgency).toUpperCase()) 
            ? String(raw.urgency).toUpperCase() : "MEDIUM",
        keywords: Array.isArray(raw.keywords) ? raw.keywords.map(String) : [],
        required_expertise: Array.isArray(raw.required_expertise) ? raw.required_expertise.map(String) : [],
        root_causes: Array.isArray(raw.root_causes) ? raw.root_causes.map(String) : [],
        summary: String(raw.summary || ""),
        ai_description: String(raw.ai_description || raw.summary || ""),
        confidence: typeof raw.confidence === "number" ? raw.confidence : parseFloat(raw.confidence) || 0.0,
        explanation: String(raw.explanation || ""),
        provider: provider,
        mode: mode
    };

    if (!normalized.domain || !normalized.summary || normalized.required_expertise.length === 0) {
        throw new Error("Invalid AI response: Missing critical fields (domain, summary, required_expertise).");
    }

    return normalized;
}

module.exports = {
    normalizeAIResponse,
    VALID_SEVERITIES,
    VALID_URGENCIES
};
