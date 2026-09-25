/**
 * lifecycle.js
 *
 * Deterministic problem lifecycle stage definitions and valid transition graph.
 */

export const LIFECYCLE_STAGES = [
  { key: "REPORTED", label: "Reported", desc: "Citizen reports challenge" },
  { key: "UNDER_REVIEW", label: "Under Review", desc: "Authority triage & validation" },
  { key: "VERIFIED", label: "Verified", desc: "Problem authenticity confirmed" },
  { key: "ASSIGNED", label: "Assigned", desc: "Assigned to nodal department/expert" },
  { key: "SOLUTION_SEARCH", label: "Solution Search", desc: "Academic & student ideation open" },
  { key: "SOLUTION_EVALUATION", label: "Evaluation", desc: "Authority statutory scoring" },
  { key: "APPROVED", label: "Selected by Authority", desc: "Handed over to Startups/MSMEs" },
  { key: "EXECUTION_SUBMITTED", label: "MSME Proofs Submitted", desc: "Execution evidence & media uploaded" },
  { key: "CLOSED", label: "Closed & Resolved", desc: "Officially resolved & closed by Authority" },
];

export const STATUS_FLOW = {
  REPORTED: ["UNDER_REVIEW", "VERIFIED", "APPROVED", "CLOSED"],
  UNDER_REVIEW: ["VERIFIED", "APPROVED", "REPORTED", "CLOSED"],
  VERIFIED: ["ASSIGNED", "SOLUTION_SEARCH", "APPROVED", "CLOSED"],
  ASSIGNED: ["SOLUTION_SEARCH", "APPROVED", "CLOSED"],
  SOLUTION_SEARCH: ["SOLUTION_EVALUATION", "APPROVED", "CLOSED"],
  SOLUTION_EVALUATION: ["APPROVED", "SOLUTION_SEARCH", "CLOSED"],
  APPROVED: ["EXECUTION_SUBMITTED", "CLOSED", "RESOLVED"],
  EXECUTION_SUBMITTED: ["CLOSED", "RESOLVED", "APPROVED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};
