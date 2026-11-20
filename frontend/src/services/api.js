/**
 * api.js
 * Domain-Specific API Handlers for CivicSync.
 *
 * All endpoints match backend/src/routes strictly.
 * No imaginary endpoints or payload shapes.
 */

import { apiRequest } from "./apiClient.js";

// ============================================================================
// AUTHENTICATION APIs (backend/src/routes/authRoutes.js)
// ============================================================================
export const authApi = {
  register: (payload) =>
    apiRequest("/api/auth/register", {
      method: "POST",
      body: payload,
      requireAuth: false,
    }),

  login: (payload) =>
    apiRequest("/api/auth/login", {
      method: "POST",
      body: payload,
      requireAuth: false,
    }),

  me: () =>
    apiRequest("/api/auth/me", {
      method: "GET",
    }),
};

// ============================================================================
// CHALLENGE APIs (backend/src/routes/challengeRoutes.js - pre-auth / fast AI)
// ============================================================================
export const challengeApi = {
  createChallenge: (payload) =>
    apiRequest("/challenges", {
      method: "POST",
      body: payload,
      requireAuth: false,
    }),
};

// ============================================================================
// PROBLEMS APIs (backend/src/routes/problemRoutes.js)
// ============================================================================
export const problemApi = {
  createProblem: (payload) =>
    apiRequest("/problems", {
      method: "POST",
      body: payload,
    }),

  getProblems: (params = {}) =>
    apiRequest("/problems", {
      method: "GET",
      params,
    }),

  uploadEvidence: (payload) =>
    apiRequest("/problems/upload", {
      method: "POST",
      body: payload,
    }),

  getMyProblems: () =>
    apiRequest("/problems/mine", {
      method: "GET",
    }),

  getProblemById: (id) =>
    apiRequest(`/problems/${id}`, {
      method: "GET",
    }),

  updateProblemStatus: (id, payload) =>
    apiRequest(`/problems/${id}/status`, {
      method: "PATCH",
      body: payload,
    }),

  getProblemStatusHistory: (id) =>
    apiRequest(`/problems/${id}/status-history`, {
      method: "GET",
    }),

  getDuplicates: (id) =>
    apiRequest(`/problems/${id}/duplicates`, {
      method: "GET",
    }),

  getProblemCluster: (id) =>
    apiRequest(`/problems/${id}/cluster`, {
      method: "GET",
    }),

  triggerClustering: (id) =>
    apiRequest(`/problems/${id}/cluster`, {
      method: "POST",
    }),

  getProblemImplementations: (problemId) =>
    apiRequest(`/problems/${problemId}/implementations`, {
      method: "GET",
    }),

  supportProblem: (id) =>
    apiRequest(`/problems/${id}/support`, {
      method: "POST",
    }),

  removeSupport: (id) =>
    apiRequest(`/problems/${id}/support`, {
      method: "DELETE",
    }),

  getSupports: (id) =>
    apiRequest(`/problems/${id}/supports`, {
      method: "GET",
    }),

  getImpactPassport: (id) =>
    apiRequest(`/problems/${id}/impact-passport`, {
      method: "GET",
    }),

  addComment: (id, payload) =>
    apiRequest(`/problems/${id}/comments`, {
      method: "POST",
      body: payload,
    }),

  getComments: (id) =>
    apiRequest(`/problems/${id}/comments`, {
      method: "GET",
    }),

  moderateComment: (id, commentId, payload) =>
    apiRequest(`/problems/${id}/comments/${commentId}/status`, {
      method: "PATCH",
      body: payload,
    }),
};

// ============================================================================
// EXPERTISE MATCHING APIs (backend/src/routes/problemRoutes.js)
// ============================================================================
export const matchingApi = {
  getFacultyMatches: (problemId, params = {}) =>
    apiRequest(`/problems/${problemId}/faculty-matches`, {
      method: "GET",
      params,
    }),

  getStudentMatches: (problemId, params = {}) =>
    apiRequest(`/problems/${problemId}/student-matches`, {
      method: "GET",
      params,
    }),

  getResearcherMatches: (problemId, params = {}) =>
    apiRequest(`/problems/${problemId}/researcher-matches`, {
      method: "GET",
      params,
    }),

  getStartupMatches: (problemId, params = {}) =>
    apiRequest(`/problems/${problemId}/startup-matches`, {
      method: "GET",
      params,
    }),

  getMsmeMatches: (problemId, params = {}) =>
    apiRequest(`/problems/${problemId}/msme-matches`, {
      method: "GET",
      params,
    }),
};

// ============================================================================
// SOLUTIONS & EVALUATION APIs (backend/src/routes/solutionRoutes.js)
// ============================================================================
export const solutionApi = {
  getSolutionsForProblem: (problemId, params = {}) =>
    apiRequest(`/problems/${problemId}/solutions`, {
      method: "GET",
      params,
    }),

  createSolution: (problemId, payload) =>
    apiRequest(`/problems/${problemId}/solutions`, {
      method: "POST",
      body: payload,
    }),

  getRankedSolutions: (problemId) =>
    apiRequest(`/problems/${problemId}/solutions/ranked`, {
      method: "GET",
    }),

  getSolutionById: (id) =>
    apiRequest(`/solutions/${id}`, {
      method: "GET",
    }),

  submitEvaluation: (solutionId, payload) =>
    apiRequest(`/solutions/${solutionId}/evaluations`, {
      method: "POST",
      body: payload,
    }),

  getEvaluations: (solutionId) =>
    apiRequest(`/solutions/${solutionId}/evaluations`, {
      method: "GET",
    }),

  getEvaluationSummary: (solutionId) =>
    apiRequest(`/solutions/${solutionId}/evaluations/summary`, {
      method: "GET",
    }),

  updateSolutionStatus: (solutionId, payload) =>
    apiRequest(`/solutions/${solutionId}/status`, {
      method: "PATCH",
      body: payload,
    }),
};

// ============================================================================
// IMPLEMENTATION & PILOT TRACKING (backend/src/routes/implementationRoutes.js)
// ============================================================================
export const implementationApi = {
  getProblemImplementations: (problemId) =>
    apiRequest(`/problems/${problemId}/implementations`, {
      method: "GET",
    }),

  createImplementationForSolution: (solutionId, payload) =>
    apiRequest(`/solutions/${solutionId}/implementations`, {
      method: "POST",
      body: payload,
    }),

  getSolutionImplementation: (solutionId) =>
    apiRequest(`/solutions/${solutionId}/implementation`, {
      method: "GET",
    }),

  getImplementationById: (id) =>
    apiRequest(`/implementations/${id}`, {
      method: "GET",
    }),

  updateStatus: (id, payload) =>
    apiRequest(`/implementations/${id}/status`, {
      method: "PATCH",
      body: payload,
    }),

  updateProgress: (id, payload) =>
    apiRequest(`/implementations/${id}/progress`, {
      method: "PATCH",
      body: payload,
    }),

  addMilestone: (id, payload) =>
    apiRequest(`/implementations/${id}/milestones`, {
      method: "POST",
      body: payload,
    }),

  updateMilestone: (id, mId, payload) =>
    apiRequest(`/implementations/${id}/milestones/${mId}`, {
      method: "PATCH",
      body: payload,
    }),

  addUpdate: (id, payload) =>
    apiRequest(`/implementations/${id}/updates`, {
      method: "POST",
      body: payload,
    }),

  getUpdates: (id) =>
    apiRequest(`/implementations/${id}/updates`, {
      method: "GET",
    }),

  addEvidence: (id, payload) =>
    apiRequest(`/implementations/${id}/evidence`, {
      method: "POST",
      body: payload,
    }),

  getEvidence: (id) =>
    apiRequest(`/implementations/${id}/evidence`, {
      method: "GET",
    }),

  verifyEvidence: (id, evidenceId, payload) =>
    apiRequest(`/implementations/${id}/evidence/${evidenceId}/verify`, {
      method: "PATCH",
      body: payload,
    }),

  raiseBlocker: (id, payload) =>
    apiRequest(`/implementations/${id}/blockers`, {
      method: "POST",
      body: payload,
    }),

  resolveBlocker: (id, bId, payload) =>
    apiRequest(`/implementations/${id}/blockers/${bId}/resolve`, {
      method: "PATCH",
      body: payload,
    }),
};

// ============================================================================
// IMPACT TRACKING APIs (backend/src/routes/impactRoutes.js)
// ============================================================================
export const impactApi = {
  getProblemImpactSummary: (problemId) =>
    apiRequest(`/problems/${problemId}/impact-summary`, {
      method: "GET",
    }),

  createImpactAssessment: (implementationId, payload) =>
    apiRequest(`/implementations/${implementationId}/impact`, {
      method: "POST",
      body: payload,
    }),

  getImpactAssessmentByImplementation: (implementationId) =>
    apiRequest(`/implementations/${implementationId}/impact`, {
      method: "GET",
    }),

  getImpactAssessmentById: (id) =>
    apiRequest(`/impact-assessments/${id}`, {
      method: "GET",
    }),

  updateImpactAssessment: (id, payload) =>
    apiRequest(`/impact-assessments/${id}`, {
      method: "PATCH",
      body: payload,
    }),

  addMetric: (id, payload) =>
    apiRequest(`/impact-assessments/${id}/metrics`, {
      method: "POST",
      body: payload,
    }),

  updateMetric: (id, mId, payload) =>
    apiRequest(`/impact-assessments/${id}/metrics/${mId}`, {
      method: "PATCH",
      body: payload,
    }),

  getComparison: (id) =>
    apiRequest(`/impact-assessments/${id}/comparison`, {
      method: "GET",
    }),

  submitFeedback: (id, payload) =>
    apiRequest(`/impact-assessments/${id}/feedback`, {
      method: "POST",
      body: payload,
    }),

  getFeedback: (id) =>
    apiRequest(`/impact-assessments/${id}/feedback`, {
      method: "GET",
    }),

  verifyImpact: (id, payload) =>
    apiRequest(`/impact-assessments/${id}/verify`, {
      method: "PATCH",
      body: payload,
    }),

  markSustained: (id, payload) =>
    apiRequest(`/impact-assessments/${id}/sustained`, {
      method: "PATCH",
      body: payload,
    }),

  addEvidence: (id, payload) =>
    apiRequest(`/impact-assessments/${id}/evidence`, {
      method: "POST",
      body: payload,
    }),

  getEvidence: (id) =>
    apiRequest(`/impact-assessments/${id}/evidence`, {
      method: "GET",
    }),

  verifyEvidence: (id, evidenceId, payload) =>
    apiRequest(`/impact-assessments/${id}/evidence/${evidenceId}/verify`, {
      method: "PATCH",
      body: payload,
    }),
};

// ============================================================================
// ROOT CAUSE ANALYSIS APIs (backend/src/routes/rootCauseRoutes.js)
// ============================================================================
export const rootCauseApi = {
  getProblemRootCauses: (problemId) =>
    apiRequest(`/problems/${problemId}/root-causes`, {
      method: "GET",
    }),

  getProblemRootCausesSummary: (problemId) =>
    apiRequest(`/problems/${problemId}/root-causes/summary`, {
      method: "GET",
    }),

  analyzeRootCauses: (problemId) =>
    apiRequest(`/problems/${problemId}/root-causes/analyze`, {
      method: "POST",
    }),

  createRootCause: (problemId, payload) =>
    apiRequest(`/problems/${problemId}/root-causes`, {
      method: "POST",
      body: payload,
    }),

  getRootCauseById: (id) =>
    apiRequest(`/root-causes/${id}`, {
      method: "GET",
    }),

  updateRootCause: (id, payload) =>
    apiRequest(`/root-causes/${id}`, {
      method: "PATCH",
      body: payload,
    }),

  addEvidence: (id, payload) =>
    apiRequest(`/root-causes/${id}/evidence`, {
      method: "POST",
      body: payload,
    }),

  getRootCauseEvidence: (id) =>
    apiRequest(`/root-causes/${id}/evidence`, {
      method: "GET",
    }),

  verifyRootCause: (id, payload) =>
    apiRequest(`/root-causes/${id}/verify`, {
      method: "PATCH",
      body: payload,
    }),
};

// ============================================================================
// PROBLEM DEPENDENCIES APIs (backend/src/routes/dependencyRoutes.js)
// ============================================================================
export const dependencyApi = {
  getProblemDependencies: (problemId) =>
    apiRequest(`/problems/${problemId}/dependencies`, {
      method: "GET",
    }),

  getDependencyGraph: (problemId) =>
    apiRequest(`/problems/${problemId}/dependency-graph`, {
      method: "GET",
    }),

  getImpactChain: (problemId) =>
    apiRequest(`/problems/${problemId}/impact-chain`, {
      method: "GET",
    }),

  detectDependencies: (problemId) =>
    apiRequest(`/problems/${problemId}/dependencies/detect`, {
      method: "POST",
    }),

  createDependency: (problemId, payload) =>
    apiRequest(`/problems/${problemId}/dependencies`, {
      method: "POST",
      body: payload,
    }),

  getDependencyById: (id) =>
    apiRequest(`/dependencies/${id}`, {
      method: "GET",
    }),

  updateDependency: (id, payload) =>
    apiRequest(`/dependencies/${id}`, {
      method: "PATCH",
      body: payload,
    }),

  deleteDependency: (id) =>
    apiRequest(`/dependencies/${id}`, {
      method: "DELETE",
    }),

  verifyDependency: (id, payload) =>
    apiRequest(`/dependencies/${id}/verify`, {
      method: "PATCH",
      body: payload,
    }),

  getCriticalPaths: () =>
    apiRequest("/dependencies/critical-paths", {
      method: "GET",
    }),
};

// ============================================================================
// AUTHORITY DASHBOARD APIs (backend/src/routes/authorityDashboardRoutes.js)
// ============================================================================
export const authorityDashboardApi = {
  getSummary: () =>
    apiRequest("/authority/dashboard/summary", {
      method: "GET",
    }),

  getPriority: (limit = 10) =>
    apiRequest("/authority/dashboard/priority", {
      method: "GET",
      params: { limit },
    }),

  getProblems: (params = {}) =>
    apiRequest("/authority/dashboard/problems", {
      method: "GET",
      params,
    }),

  getDistricts: () =>
    apiRequest("/authority/dashboard/districts", {
      method: "GET",
    }),

  getStatusAnalytics: () =>
    apiRequest("/authority/dashboard/status", {
      method: "GET",
    }),

  getClusters: () =>
    apiRequest("/authority/dashboard/clusters", {
      method: "GET",
    }),

  getRecent: (limit = 10) =>
    apiRequest("/authority/dashboard/recent", {
      method: "GET",
      params: { limit },
    }),

  getInstitutionalParticipation: () =>
    apiRequest("/authority/dashboard/institutional-participation", {
      method: "GET",
    }),

  getIndustryEcosystem: () =>
    apiRequest("/authority/dashboard/industry-ecosystem", {
      method: "GET",
    }),

  getFunding: () =>
    apiRequest("/authority/dashboard/funding", {
      method: "GET",
    }),

  getTesting: () =>
    apiRequest("/authority/dashboard/testing", {
      method: "GET",
    }),

  getOutcomes: () =>
    apiRequest("/authority/dashboard/outcomes", {
      method: "GET",
    }),
};

// ============================================================================
// REPUTATION & RANKINGS APIs (backend/src/routes/reputationRoutes.js)
// ============================================================================
export const reputationApi = {
  getMyReputation: () =>
    apiRequest("/reputation/me", {
      method: "GET",
    }),

  getRankingsOverview: () =>
    apiRequest("/rankings", {
      method: "GET",
    }),

  getUserRankings: () =>
    apiRequest("/rankings/users", {
      method: "GET",
    }),

  getUniversityRankings: () =>
    apiRequest("/rankings/universities", {
      method: "GET",
    }),

  getOrganizationRankings: () =>
    apiRequest("/rankings/organizations", {
      method: "GET",
    }),

  getUserReputation: (userId) =>
    apiRequest(`/users/${userId}/reputation`, {
      method: "GET",
    }),

  getUserBadges: (userId) =>
    apiRequest(`/users/${userId}/badges`, {
      method: "GET",
    }),
};

// ============================================================================
// NOTIFICATIONS APIs (backend/src/routes/notificationRoutes.js)
// ============================================================================
export const notificationApi = {
  getNotifications: (params = {}) =>
    apiRequest("/notifications", {
      method: "GET",
      params,
    }),

  getUnreadCount: () =>
    apiRequest("/notifications/unread-count", {
      method: "GET",
    }),

  markAllRead: () =>
    apiRequest("/notifications/read-all", {
      method: "PATCH",
    }),

  getNotificationById: (id) =>
    apiRequest(`/notifications/${id}`, {
      method: "GET",
    }),

  markRead: (id) =>
    apiRequest(`/notifications/${id}/read`, {
      method: "PATCH",
    }),

  deleteNotification: (id) =>
    apiRequest(`/notifications/${id}`, {
      method: "DELETE",
    }),
};

// ============================================================================
// COLLABORATION TEAMS APIs (backend/src/routes/teamRoutes.js) — M9
// ============================================================================
export const teamApi = {
  createTeam: (payload) =>
    apiRequest("/teams", {
      method: "POST",
      body: payload,
    }),

  getTeam: (id) =>
    apiRequest(`/teams/${id}`, {
      method: "GET",
    }),

  getTeamsForProblem: (problemId) =>
    apiRequest(`/problems/${problemId}/teams`, {
      method: "GET",
    }),

  inviteMember: (teamId, payload) =>
    apiRequest(`/teams/${teamId}/invite`, {
      method: "POST",
      body: payload,
    }),

  acceptInvitation: (teamId) =>
    apiRequest(`/teams/${teamId}/accept`, {
      method: "POST",
    }),

  declineInvitation: (teamId) =>
    apiRequest(`/teams/${teamId}/decline`, {
      method: "POST",
    }),

  removeMember: (teamId, userId) =>
    apiRequest(`/teams/${teamId}/members/${userId}`, {
      method: "DELETE",
    }),

  updateTeamStatus: (teamId, payload) =>
    apiRequest(`/teams/${teamId}/status`, {
      method: "PATCH",
      body: payload,
    }),
};

// ============================================================================
// TRUST & ANTI-GAMING APIs (backend/src/routes/trustRoutes.js) — M16
// ============================================================================
export const trustApi = {
  getEvents: (params = {}) =>
    apiRequest("/trust", {
      method: "GET",
      params,
    }),

  reviewEvent: (id, payload) =>
    apiRequest(`/trust/${id}/review`, {
      method: "PATCH",
      body: payload,
    }),
};

// ============================================================================
// ANALYTICS DASHBOARD APIs (backend/src/routes/analyticsRoutes.js) — M17
// ============================================================================
export const analyticsApi = {
  getOverview: () =>
    apiRequest("/analytics/overview", {
      method: "GET",
    }),

  getPipeline: () =>
    apiRequest("/analytics/pipeline", {
      method: "GET",
    }),

  getCommunity: () =>
    apiRequest("/analytics/community", {
      method: "GET",
    }),

  getTrust: () =>
    apiRequest("/analytics/trust", {
      method: "GET",
    }),
};

// ============================================================================
// STUDENT WORKFLOW & MATCHING APIs (backend/src/routes/studentRoutes.js)
// ============================================================================
export const studentApi = {
  getProfile: () =>
    apiRequest("/students/me/profile", {
      method: "GET",
    }),

  updateSkills: (skills) =>
    apiRequest("/students/me/skills", {
      method: "PUT",
      body: { skills },
    }),

  getMatchedProblems: (params = {}) =>
    apiRequest("/students/me/matches", {
      method: "GET",
      params,
    }),
};

// ============================================================================
// UNIVERSITY APIs (backend/src/routes/universityRoutes.js)
// ============================================================================
export const universityApi = {
  getDashboardCounts: () =>
    apiRequest("/university/me/dashboard", {
      method: "GET",
    }),
  getFacultyAndStudents: () =>
    apiRequest("/university/me/faculty-students", {
      method: "GET",
    }),
  getMatchedChallenges: () =>
    apiRequest("/university/challenges", {
      method: "GET",
    }),
  getChallengeEvaluation: (problemId) =>
    apiRequest(`/university/challenges/${problemId}/evaluation`, {
      method: "GET",
    }),
  createChallengeEvaluation: (problemId, payload) =>
    apiRequest(`/university/challenges/${problemId}/evaluation`, {
      method: "POST",
      body: payload,
    }),
  updateChallengeEvaluation: (problemId, payload) =>
    apiRequest(`/university/challenges/${problemId}/evaluation`, {
      method: "PATCH",
      body: payload,
    }),
};

// ============================================================================
// INSTITUTIONAL PROJECTS APIs (backend/src/routes/projectRoutes.js)
// ============================================================================
export const projectApi = {
  getProjects: () =>
    apiRequest("/projects", {
      method: "GET",
    }),

  createProject: (payload) =>
    apiRequest("/projects", {
      method: "POST",
      body: payload,
    }),

  updateProjectStatus: (id, payload) =>
    apiRequest(`/projects/${id}/status`, {
      method: "PATCH",
      body: payload,
    }),

  getProjectTests: (id) =>
    apiRequest(`/projects/${id}/tests`, {
      method: "GET",
    }),

  recordTestResult: (id, payload) =>
    apiRequest(`/projects/${id}/tests`, {
      method: "POST",
      body: payload,
    }),

  addIndustryCollaboration: (id, payload) =>
    apiRequest(`/projects/${id}/collaborations`, {
      method: "POST",
      body: payload,
    }),

  updateCollaborationStatus: (id, collabId, payload) =>
    apiRequest(`/projects/${id}/collaborations/${collabId}`, {
      method: "PATCH",
      body: payload,
    }),

  getProjectTeam: (id) =>
    apiRequest(`/projects/${id}/team`, {
      method: "GET",
    }),

  setProjectTeam: (id, payload) =>
    apiRequest(`/projects/${id}/team`, {
      method: "POST",
      body: payload,
    }),

  addProjectTeamMember: (id, payload) =>
    apiRequest(`/projects/${id}/team/members`, {
      method: "POST",
      body: payload,
    }),

  removeProjectTeamMember: (id, userId) =>
    apiRequest(`/projects/${id}/team/members/${userId}`, {
      method: "DELETE",
    }),

  getProjectMentor: (id) =>
    apiRequest(`/projects/${id}/mentor`, {
      method: "GET",
    }),

  getEligibleMentors: (id) =>
    apiRequest(`/projects/${id}/eligible-mentors`, {
      method: "GET",
    }),

  assignFacultyMentor: (id, payload) =>
    apiRequest(`/projects/${id}/mentor`, {
      method: "POST",
      body: payload,
    }),

  removeFacultyMentor: (id) =>
    apiRequest(`/projects/${id}/mentor`, {
      method: "DELETE",
    }),

  getProjectCollaborations: (id) =>
    apiRequest(`/projects/${id}/collaborations`, {
      method: "GET",
    }),

  getEligiblePartners: (id) =>
    apiRequest(`/projects/${id}/eligible-partners`, {
      method: "GET",
    }),

  getProjectFunding: (id) =>
    apiRequest(`/projects/${id}/funding`, {
      method: "GET",
    }),

  requestFunding: (id, payload) =>
    apiRequest(`/projects/${id}/funding`, {
      method: "POST",
      body: payload,
    }),

  updateFundingStatus: (id, fundingId, payload) =>
    apiRequest(`/projects/${id}/funding/${fundingId}`, {
      method: "PATCH",
      body: payload,
    }),

  getProjectOutcomes: (id) =>
    apiRequest(`/projects/${id}/outcomes`, {
      method: "GET",
    }),

  addOutcome: (id, payload) =>
    apiRequest(`/projects/${id}/outcomes`, {
      method: "POST",
      body: payload,
    }),

  getProjectActivity: (id) =>
    apiRequest(`/projects/${id}/activity`, {
      method: "GET",
    }),
};
