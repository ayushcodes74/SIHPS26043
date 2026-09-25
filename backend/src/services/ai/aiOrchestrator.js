const { analyzeWithGrok, explainMatchWithGrok } = require("./providers/grokProvider");
const { analyzeWithOpenRouter, explainMatchWithOpenRouter } = require("./providers/openrouterProvider");
const { analyzeWithGemini, explainMatchWithGemini } = require("./providers/geminiProvider");
const { analyzeWithNLP, explainMatchWithNLP } = require("./providers/nlpFallbackProvider");
const { getValidExpertiseNames, validateAndMapExpertise } = require("./aiValidator");

const PROVIDERS = {
    grok: { analyze: analyzeWithGrok, explain: explainMatchWithGrok },
    openrouter: { analyze: analyzeWithOpenRouter, explain: explainMatchWithOpenRouter },
    gemini: { analyze: analyzeWithGemini, explain: explainMatchWithGemini },
    nlp: { analyze: analyzeWithNLP, explain: explainMatchWithNLP }
};

function getProviderOrder() {
    const defaultOrder = ["grok", "openrouter", "gemini", "nlp"];
    const envOrder = process.env.AI_PROVIDER_ORDER;
    if (!envOrder) return defaultOrder;
    
    const parsed = envOrder.split(",").map(s => s.trim().toLowerCase());
    // Always ensure NLP is in the chain as the ultimate fallback
    if (!parsed.includes("nlp")) parsed.push("nlp");
    return parsed;
}

function buildAnalysisPrompt(challenge) {
    const validExpertise = getValidExpertiseNames();
    
    return `
Analyze the following civic challenge and provide structured JSON output.

PROBLEM DATA:
Title: ${challenge.title}
Description: ${challenge.description}
Location: ${challenge.district || "Unknown"}, ${challenge.city || "Unknown"}

REQUIRED SCHEMA:
{
  "domain": "String (e.g. Water & Sanitation)",
  "subdomain": "String (e.g. Drinking Water Quality)",
  "severity": "Enum [LOW, MEDIUM, HIGH, CRITICAL]",
  "urgency": "Enum [LOW, MEDIUM, HIGH, CRITICAL]",
  "keywords": ["Array", "of", "strings"],
  "required_expertise": ["Array", "of", "strings"],
  "root_causes": ["Array", "of", "strings"],
  "summary": "String (A concise 1-2 sentence summary of the issue)",
  "ai_description": "String (A detailed technical AI breakdown of the civic problem, its root causes, and recommended engineering approach)",
  "confidence": "Float between 0.0 and 1.0",
  "explanation": "String (Why you chose these classifications)"
}

CRITICAL RULES:
1. The "required_expertise" array MUST ONLY contain values from this allowed list:
${JSON.stringify(validExpertise)}
Do NOT invent any expertise that is not on this list.

2. Output ONLY valid JSON.
`;
}

function buildExplainPrompt(problemReqs, profileSkills, matchScore) {
    return `
You are explaining a matching score for a civic technology platform.

Problem Required Expertise:
${JSON.stringify(problemReqs)}

Candidate Profile Skills:
${JSON.stringify(profileSkills)}

Deterministic Match Score Calculated: ${matchScore}%

Write a 1-2 sentence explanation of why this is a ${matchScore}% match based on the overlap between required expertise and candidate skills. Focus on the actual overlapping skills and how any remaining candidate skills might provide supporting capability. 
Do not invent anything. Use a professional, direct tone.
`;
}

async function analyzeChallenge(challenge) {
    const order = getProviderOrder();
    const prompt = buildAnalysisPrompt(challenge);
    let lastError = null;

    for (const providerKey of order) {
        const provider = PROVIDERS[providerKey];
        if (!provider) continue;

        const startTime = Date.now();
        try {
            let result;
            if (providerKey === "nlp") {
                // NLP takes the raw challenge object
                result = await provider.analyze(challenge);
            } else {
                result = await provider.analyze(prompt);
            }

            // Validate and map expertise
            result.required_expertise = validateAndMapExpertise(result.required_expertise);

            const latency = Date.now() - startTime;
            console.log(`[AI] provider=${providerKey} success=true latency=${latency}ms mode=${result.mode}`);
            return result;
        } catch (error) {
            const latency = Date.now() - startTime;
            console.warn(`[AI] provider=${providerKey} success=false latency=${latency}ms reason="${error.message}"`);
            lastError = error;
        }
    }

    // Zero-downtime safety guarantee: If all providers fail, use local semantic classifier
    console.warn("All AI providers and remote NLP failed. Activating local semantic classifier.");
    const { localSemanticAnalysis } = require("./providers/nlpFallbackProvider");
    return localSemanticAnalysis(challenge);
}

async function explainMatch(problemReqs, profileSkills, matchScore) {
    if (process.env.NODE_ENV === "test") {
        return null;
    }

    const order = getProviderOrder();
    const prompt = buildExplainPrompt(problemReqs, profileSkills, matchScore);
    const timeoutMs = parseInt(process.env.AI_EXPLANATION_TIMEOUT_MS) || 2000;
    
    const explainPromise = (async () => {
        for (const providerKey of order) {
            if (providerKey === "nlp") continue; // NLP does not support natural language explanation

            const provider = PROVIDERS[providerKey];
            if (!provider) continue;

            const startTime = Date.now();
            try {
                const result = await provider.explain(prompt);
                const latency = Date.now() - startTime;
                console.log(`[AI] explain provider=${providerKey} success=true latency=${latency}ms`);
                return result;
            } catch (error) {
                const latency = Date.now() - startTime;
                console.warn(`[AI] explain provider=${providerKey} success=false latency=${latency}ms reason="${error.message}"`);
            }
        }
        return null;
    })();

    return Promise.race([
        explainPromise,
        new Promise(resolve => setTimeout(() => resolve(null), timeoutMs))
    ]);
}

module.exports = {
    analyzeChallenge,
    explainMatch,
    getProviderOrder
};
