import { useState, useEffect } from "react";
import { projectApi } from "../../services/api";
import { useAuth } from "../../context/useAuth.js";
import { Card } from "../../components/common/Cards";
import { Button } from "../../components/common/Button";
import { StatusBadge } from "../../components/common/Badges";
import { Icon } from "../../components/common/Icons";
import { useRouter } from "../../context/useRouter.js";

export function ProjectWorkspacePage({ id }) {
  const { navigate } = useRouter();
  const { role, user } = useAuth();
  const [project, setProject] = useState(null);
  const [activity, setActivity] = useState([]);
  const [team, setTeam] = useState(null);
  const [mentor, setMentor] = useState(null);
  const [collaborations, setCollaborations] = useState([]);
  const [funding, setFunding] = useState([]);
  const [eligibleMentors, setEligibleMentors] = useState([]);
  const [eligiblePartners, setEligiblePartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(false);
  const [mentorLoading, setMentorLoading] = useState(false);
  const [collabLoading, setCollabLoading] = useState(false);
  const [fundingLoading, setFundingLoading] = useState(false);
  const [error, setError] = useState("");
  const [newMemberId, setNewMemberId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("STUDENT");
  const [selectedMentorId, setSelectedMentorId] = useState("");
  const [tests, setTests] = useState([]);
  const [testLoading, setTestLoading] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  
  // Funding request form state
  const [reqAmount, setReqAmount] = useState("");
  const [reqSource, setReqSource] = useState("");
  const [reqRequirement, setReqRequirement] = useState("");

  // Testing & Evidence form state
  const [testDesc, setTestDesc] = useState("");
  const [testResStr, setTestResStr] = useState("");
  const [testOutcome, setTestOutcome] = useState("PASS");
  const [testRemarks, setTestRemarks] = useState("");
  const [testEvidence, setTestEvidence] = useState("");

  // Outcomes form state
  const [outcomes, setOutcomes] = useState([]);
  const [outcomeLoading, setOutcomeLoading] = useState(false);
  const [outcomeType, setOutcomeType] = useState("PATENT");
  const [outcomeTitle, setOutcomeTitle] = useState("");
  const [outcomeStatus, setOutcomeStatus] = useState("FILED");
  const [outcomeRefUrl, setOutcomeRefUrl] = useState("");

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await projectApi.getProjects();
      const proj = res.projects?.find((p) => String(p.id) === String(id));
      setProject(proj);

      if (proj) {
        const [actRes, teamRes, mentorRes, collabRes, fundingRes, testsRes, outcomesRes] = await Promise.all([
          projectApi.getProjectActivity(id),
          projectApi.getProjectTeam(id).catch(() => ({ team: [] })),
          projectApi.getProjectMentor(id).catch(() => ({ mentor: null })),
          projectApi.getProjectCollaborations(id).catch(() => ({ collaborations: [] })),
          projectApi.getProjectFunding(id).catch(() => ({ funding: [] })),
          projectApi.getProjectTests(id).catch(() => ({ tests: [] })),
          projectApi.getProjectOutcomes(id).catch(() => ({ outcomes: [] }))
        ]);
        setActivity(actRes.activity || []);
        setTeam(teamRes.team || []);
        setMentor(mentorRes.mentor || null);
        setCollaborations(collabRes.collaborations || []);
        setFunding(fundingRes.funding || []);
        setTests(testsRes.tests || []);
        setOutcomes(outcomesRes.outcomes || []);
        
        if (role === "UNIVERSITY" || role === "ADMIN") {
           projectApi.getEligibleMentors(id)
             .then(res => setEligibleMentors(res.eligibleMentors || []))
             .catch(e => console.warn("Failed to load eligible mentors", e));
             
           projectApi.getEligiblePartners(id)
             .then(res => setEligiblePartners(res.eligiblePartners || []))
             .catch(e => console.warn("Failed to load eligible partners", e));
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load project data");
    } finally {
      setLoading(false);
    }
  };

  const fetchProject = async () => {
    await loadProjectData();
  };

  useEffect(() => {
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAddMember = async () => {
    if (!newMemberId) return;
    try {
      setTeamLoading(true);
      await projectApi.addProjectTeamMember(id, { user_id: newMemberId, role: newMemberRole });
      await fetchProject();
      setNewMemberId("");
    } catch (err) {
      alert("Failed to add member: " + (err.response?.data?.message || err.message));
    } finally {
      setTeamLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Remove this member from the project?")) return;
    try {
      setTeamLoading(true);
      await projectApi.removeProjectTeamMember(id, userId);
      await fetchProject();
    } catch (err) {
      alert("Failed to remove member: " + (err.response?.data?.message || err.message));
    } finally {
      setTeamLoading(false);
    }
  };

  const handleAssignMentor = async () => {
    if (!selectedMentorId) return;
    try {
      setMentorLoading(true);
      await projectApi.assignFacultyMentor(id, { mentor_id: selectedMentorId });
      await fetchProject();
      setSelectedMentorId("");
    } catch (err) {
      alert("Failed to assign mentor: " + (err.response?.data?.message || err.message));
    } finally {
      setMentorLoading(false);
    }
  };

  const handleRemoveMentor = async () => {
    if (!window.confirm("Remove current faculty mentor?")) return;
    try {
      setMentorLoading(true);
      await projectApi.removeFacultyMentor(id);
      await fetchProject();
    } catch (err) {
      alert("Failed to remove mentor: " + (err.response?.data?.message || err.message));
    } finally {
      setMentorLoading(false);
    }
  };

  const handleInvitePartner = async () => {
    if (!selectedPartnerId) return;
    try {
      setCollabLoading(true);
      await projectApi.addIndustryCollaboration(id, { partner_id: selectedPartnerId });
      await fetchProject();
      setSelectedPartnerId("");
    } catch (err) {
      alert("Failed to invite partner: " + (err.response?.data?.message || err.message));
    } finally {
      setCollabLoading(false);
    }
  };

  const handleUpdateCollabStatus = async (collabId, status) => {
    try {
      setCollabLoading(true);
      await projectApi.updateCollaborationStatus(id, collabId, { status });
      await fetchProject();
    } catch (err) {
      alert(`Failed to update collaboration to ${status}: ` + (err.response?.data?.message || err.message));
    } finally {
      setCollabLoading(false);
    }
  };

  const handleRequestFunding = async () => {
    if (!reqAmount || !reqSource) {
      alert("Amount and Source are required");
      return;
    }
    try {
      setFundingLoading(true);
      await projectApi.requestFunding(id, {
        requested_amount: reqAmount,
        funding_source: reqSource,
        funding_requirement: reqRequirement
      });
      await fetchProject();
      setReqAmount("");
      setReqSource("");
      setReqRequirement("");
    } catch (err) {
      alert("Failed to request funding: " + (err.response?.data?.message || err.message));
    } finally {
      setFundingLoading(false);
    }
  };

  const handleUpdateFundingStatus = async (fundingId, status) => {
    try {
      setFundingLoading(true);
      await projectApi.updateFundingStatus(id, fundingId, { status });
      await fetchProject();
    } catch (err) {
      alert(`Failed to update funding status to ${status}: ` + (err.response?.data?.message || err.message));
    } finally {
      setFundingLoading(false);
    }
  };

  const handleRecordTest = async () => {
    if (!testDesc || !testResStr || !testOutcome) {
      alert("Description, Result, and Outcome are required.");
      return;
    }
    try {
      setTestLoading(true);
      await projectApi.recordTestResult(id, {
        test_description: testDesc,
        test_result: testResStr,
        outcome: testOutcome,
        remarks: testRemarks,
        evidence_url: testEvidence
      });
      await fetchProject();
      setTestDesc("");
      setTestResStr("");
      setTestOutcome("PASS");
      setTestRemarks("");
      setTestEvidence("");
    } catch (err) {
      alert("Failed to record test result: " + (err.response?.data?.message || err.message));
    } finally {
      setTestLoading(false);
    }
  };

  const handleAddOutcome = async () => {
    if (!outcomeTitle || !outcomeType || !outcomeStatus) {
      alert("Title, Type, and Status are required.");
      return;
    }
    try {
      setOutcomeLoading(true);
      await projectApi.addOutcome(id, {
        outcome_type: outcomeType,
        title: outcomeTitle,
        status: outcomeStatus,
        reference_document_url: outcomeRefUrl
      });
      await fetchProject();
      setOutcomeTitle("");
      setOutcomeType("PATENT");
      setOutcomeStatus("FILED");
      setOutcomeRefUrl("");
    } catch (err) {
      alert("Failed to add outcome: " + (err.response?.data?.message || err.message));
    } finally {
      setOutcomeLoading(false);
    }
  };

  if (loading) return <div style={{ padding: "3rem", textAlign: "center" }}><Icon name="spinner" size={24} /> Loading Project Workspace...</div>;

  if (!project) return (
    <Card style={{ padding: "3rem", textAlign: "center" }}>
      <Icon name="alert-triangle" size={32} color="var(--color-danger)" />
      <h3>Project Not Found</h3>
      <p>{error}</p>
      <Button variant="outline" onClick={() => navigate("/dashboard")}>Return to Dashboard</Button>
    </Card>
  );

  const STAGES = ["CHALLENGE_ACCEPTED", "PROPOSAL", "PROTOTYPE", "TESTING", "PILOT", "DEPLOYMENT", "COMPLETED"];
  const currentStageIdx = STAGES.indexOf(project.project_status);
  const nextStage = currentStageIdx >= 0 && currentStageIdx < STAGES.length - 1 ? STAGES[currentStageIdx + 1] : null;
  const canUpdateStatus = role === "UNIVERSITY" || role === "AUTHORITY" || role === "ADMIN";
  const canManageTeam = role === "UNIVERSITY" || role === "ADMIN";
  const canManageIndustry = role === "UNIVERSITY" || role === "ADMIN";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", paddingBottom: "3rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
        <span style={{ cursor: "pointer", color: "var(--color-primary)", fontWeight: 600 }} onClick={() => navigate("/dashboard")}>Dashboard</span>
        <span>/</span>
        <span style={{ cursor: "pointer", color: "var(--color-primary)", fontWeight: 600 }} onClick={() => navigate("/projects")}>Projects</span>
        <span>/</span>
        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{project.title || `#${project.id}`}</span>
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
              <StatusBadge status={project.project_status} />
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Linked to Challenge #{project.problem_id}</span>
            </div>
            <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem" }}>{project.title}</h1>
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>{project.description}</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Button variant="outline" onClick={() => navigate(`/problems/${project.problem_id}`)}>View Original Challenge</Button>
            {canUpdateStatus && nextStage && (
              <Button
                variant="primary"
                icon="chevron-right"
                onClick={async () => {
                  if (!window.confirm(`Advance project to "${nextStage}"?`)) return;
                  try {
                    await projectApi.updateProjectStatus(id, { status: nextStage });
                    await fetchProject();
                  } catch (err) {
                    alert("Failed to advance stage: " + (err.message || "Unknown error"));
                  }
                }}
              >
                Advance to {nextStage}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="cs-grid-2">
        <Card title="Project Lifecycle" subtitle="Current stage">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
            {STAGES.map((stage, idx) => {
              const isPast = idx < currentStageIdx;
              const isCurrent = idx === currentStageIdx;
              return (
                <div key={stage} style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.75rem", borderRadius: "var(--radius-sm)",
                  backgroundColor: isCurrent ? "var(--color-primary-subtle)" : (isPast ? "var(--color-success-subtle)" : "var(--bg-muted)"),
                  border: `1px solid ${isCurrent ? "var(--color-primary-border)" : (isPast ? "var(--color-success)" : "var(--border-color)")}`,
                  opacity: isPast ? 0.8 : 1
                }}>
                  <Icon name={isCurrent ? "check-circle" : (isPast ? "check" : "circle")} size={16} color={isCurrent ? "var(--color-primary)" : (isPast ? "var(--color-success)" : "var(--text-muted)")} />
                  <span style={{ fontWeight: isCurrent ? 700 : 500 }}>{stage}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Team & Collaborations" subtitle="Project participants">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Multidisciplinary Team */}
            <div style={{ padding: "1rem", backgroundColor: "#ffffff", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h5 style={{ margin: 0, fontSize: "0.95rem" }}>Multidisciplinary Team</h5>
              </div>
              
              {!team || team.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>No team assigned yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                  {team.map(member => (
                    <div key={member.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", backgroundColor: "var(--bg-muted)", borderRadius: "var(--radius-sm)" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{member.name || `User #${member.user_id}`}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Role: {member.role || "MEMBER"}</div>
                      </div>
                      {canManageTeam && (
                        <Button variant="ghost" size="sm" style={{ color: "var(--color-danger)" }} onClick={() => handleRemoveMember(member.user_id)}>Remove</Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {canManageTeam && (
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <select 
                    value={newMemberRole} 
                    onChange={e => setNewMemberRole(e.target.value)}
                    style={{ padding: "0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                  >
                    <option value="STUDENT">Student</option>
                    <option value="FACULTY">Faculty</option>
                    <option value="RESEARCHER">Researcher</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Enter User ID" 
                    value={newMemberId}
                    onChange={(e) => setNewMemberId(e.target.value)}
                    style={{ flex: 1, padding: "0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                  />
                  <Button variant="outline" size="sm" onClick={handleAddMember} disabled={teamLoading || !newMemberId}>
                    {teamLoading ? "Adding..." : "Add Member"}
                  </Button>
                </div>
              )}
            </div>

            {/* Faculty Mentor */}
            <div style={{ padding: "1rem", backgroundColor: "var(--bg-muted)", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h5 style={{ margin: 0, fontSize: "0.9rem" }}>Faculty Mentor</h5>
                {mentor && (
                  <StatusBadge status={mentor.mentorship_status} />
                )}
              </div>
              
              {!mentor ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>No mentor assigned.</div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", backgroundColor: "#ffffff", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{mentor.name}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{mentor.email}</div>
                  </div>
                  {canManageTeam && (
                    <Button variant="ghost" size="sm" style={{ color: "var(--color-danger)" }} onClick={handleRemoveMentor} disabled={mentorLoading}>Remove</Button>
                  )}
                </div>
              )}
              
              {canManageTeam && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {eligibleMentors.length > 0 ? (
                    <select
                      value={selectedMentorId}
                      onChange={e => setSelectedMentorId(e.target.value)}
                      style={{ flex: 1, padding: "0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                    >
                      <option value="">Select an eligible faculty member</option>
                      {eligibleMentors.map(fac => (
                        <option key={fac.id} value={fac.id}>{fac.name} ({fac.email})</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      placeholder="Enter Mentor User ID" 
                      value={selectedMentorId}
                      onChange={(e) => setSelectedMentorId(e.target.value)}
                      style={{ flex: 1, padding: "0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                    />
                  )}
                  <Button variant="outline" size="sm" onClick={handleAssignMentor} disabled={mentorLoading || !selectedMentorId}>
                    {mentorLoading ? "Assigning..." : mentor ? "Replace Mentor" : "Assign Mentor"}
                  </Button>
                </div>
              )}
            </div>
            <div style={{ padding: "1rem", backgroundColor: "var(--bg-muted)", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h5 style={{ margin: 0, fontSize: "0.9rem" }}>Industry Collaboration</h5>
              </div>

              {collaborations.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                  Awaiting MSME / Startup assignment.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                  {collaborations.map(collab => {
                    const isOwnPartner = collab.partner_id === user?.id;
                    const canModifyOwn = role === "STARTUP" || role === "MSME";
                    return (
                      <div key={collab.collab_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", backgroundColor: "#ffffff", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{collab.name}</div>
                          <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.25rem" }}>
                            <Icon name={collab.role === "STARTUP" ? "rocket" : "briefcase"} size={12} />
                            {collab.role}
                            <span style={{ margin: "0 0.25rem" }}>•</span>
                            <StatusBadge status={collab.collaboration_status} />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          {(canUpdateStatus && (collab.collaboration_status === 'ACTIVE' || collab.collaboration_status === 'ACCEPTED')) && (
                             <Button variant="ghost" size="sm" onClick={() => handleUpdateCollabStatus(collab.collab_id, 'COMPLETED')} disabled={collabLoading}>Mark Completed</Button>
                          )}
                          {(canModifyOwn && isOwnPartner && collab.collaboration_status === 'INVITED') && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleUpdateCollabStatus(collab.collab_id, 'ACCEPTED')} disabled={collabLoading}>Accept</Button>
                              <Button variant="ghost" size="sm" style={{ color: "var(--color-danger)" }} onClick={() => handleUpdateCollabStatus(collab.collab_id, 'DECLINED')} disabled={collabLoading}>Decline</Button>
                            </>
                          )}
                          {(canModifyOwn && isOwnPartner && collab.collaboration_status === 'ACCEPTED') && (
                              <Button variant="outline" size="sm" onClick={() => handleUpdateCollabStatus(collab.collab_id, 'ACTIVE')} disabled={collabLoading}>Activate</Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {canManageIndustry && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {eligiblePartners.length > 0 ? (
                    <select
                      value={selectedPartnerId}
                      onChange={e => setSelectedPartnerId(e.target.value)}
                      style={{ flex: 1, padding: "0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                    >
                      <option value="">Select an eligible Startup/MSME</option>
                      {eligiblePartners.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      placeholder="Enter Partner User ID" 
                      value={selectedPartnerId}
                      onChange={(e) => setSelectedPartnerId(e.target.value)}
                      style={{ flex: 1, padding: "0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                    />
                  )}
                  <Button variant="outline" size="sm" onClick={handleInvitePartner} disabled={collabLoading || !selectedPartnerId}>
                    {collabLoading ? "Inviting..." : "Invite Partner"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Project Funding */}
        <Card title="Project Funding" subtitle="Track project financial resources" style={{ gridColumn: "1 / -1" }}>
          {funding.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              No funding records found.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              {funding.map(fund => (
                <div key={fund.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "1rem", backgroundColor: "#ffffff", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.25rem" }}>{fund.funding_source}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                      Requested: ₹{fund.requested_amount} {fund.approved_amount > 0 && ` | Approved: ₹${fund.approved_amount}`}
                    </div>
                    {fund.funding_requirement && (
                      <div style={{ fontSize: "0.85rem" }}>{fund.funding_requirement}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                    <StatusBadge status={fund.funding_status} />
                    
                    {/* Action buttons based on status and role */}
                    {(role === "AUTHORITY" || role === "ADMIN") && fund.funding_status === "REQUESTED" && (
                      <Button variant="outline" size="sm" onClick={() => handleUpdateFundingStatus(fund.id, "UNDER_REVIEW")} disabled={fundingLoading}>Start Review</Button>
                    )}
                    {(role === "AUTHORITY" || role === "ADMIN") && fund.funding_status === "UNDER_REVIEW" && (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <Button variant="outline" size="sm" onClick={() => handleUpdateFundingStatus(fund.id, "APPROVED")} disabled={fundingLoading}>Approve</Button>
                        <Button variant="ghost" size="sm" style={{ color: "var(--color-danger)" }} onClick={() => handleUpdateFundingStatus(fund.id, "REJECTED")} disabled={fundingLoading}>Reject</Button>
                      </div>
                    )}
                    {canUpdateStatus && fund.funding_status === "APPROVED" && (
                      <Button variant="primary" size="sm" onClick={() => handleUpdateFundingStatus(fund.id, "RECEIVED")} disabled={fundingLoading}>Mark Received</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {canUpdateStatus && (
            <div style={{ padding: "1rem", backgroundColor: "var(--bg-muted)", borderRadius: "var(--radius-md)" }}>
              <h5 style={{ margin: "0 0 1rem", fontSize: "0.9rem" }}>Request Funding</h5>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <input 
                  type="text" 
                  placeholder="Funding Source (e.g. CSR, Grant)" 
                  value={reqSource}
                  onChange={(e) => setReqSource(e.target.value)}
                  style={{ padding: "0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                />
                <input 
                  type="number" 
                  placeholder="Amount (₹)" 
                  value={reqAmount}
                  onChange={(e) => setReqAmount(e.target.value)}
                  style={{ padding: "0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                />
              </div>
              <textarea 
                placeholder="Funding requirement / Purpose" 
                value={reqRequirement}
                onChange={(e) => setReqRequirement(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", marginBottom: "1rem", minHeight: "60px", resize: "vertical" }}
              />
              <Button variant="outline" size="sm" onClick={handleRequestFunding} disabled={fundingLoading || !reqAmount || !reqSource}>
                {fundingLoading ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          )}
        </Card>

        <Card title="Testing & Evidence" subtitle="Record and view test results" style={{ gridColumn: "1 / -1" }}>
          {tests.length === 0 ? (
             <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>No tests recorded yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
              {tests.map(test => (
                <div key={test.id} style={{ display: "flex", justifyContent: "space-between", padding: "1rem", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
                  <div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{test.test_description}</span>
                      <StatusBadge status={test.outcome} />
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                      <strong>Result:</strong> {test.test_result}
                    </div>
                    {test.remarks && (
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", marginBottom: "0.5rem" }}>
                        "{test.remarks}"
                      </div>
                    )}
                    {test.evidence_url && (
                      <a href={test.evidence_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", color: "var(--color-primary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                        <Icon name="link" size={12} /> View Evidence
                      </a>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {new Date(test.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {canUpdateStatus && (
            <div style={{ padding: "1rem", backgroundColor: "var(--bg-muted)", borderRadius: "var(--radius-md)" }}>
              <h5 style={{ margin: "0 0 1rem", fontSize: "0.9rem" }}>Record Test Result</h5>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <input 
                  type="text" 
                  placeholder="Test Description / Type" 
                  value={testDesc}
                  onChange={(e) => setTestDesc(e.target.value)}
                  style={{ padding: "0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                />
                <select
                  value={testOutcome}
                  onChange={(e) => setTestOutcome(e.target.value)}
                  style={{ padding: "0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                >
                  <option value="PASS">PASS</option>
                  <option value="PARTIAL">PARTIAL</option>
                  <option value="FAIL">FAIL</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem", marginBottom: "1rem" }}>
                <input 
                  type="text" 
                  placeholder="Quantitative / Qualitative Result (e.g. 95% efficiency)" 
                  value={testResStr}
                  onChange={(e) => setTestResStr(e.target.value)}
                  style={{ padding: "0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                />
                <input 
                  type="text" 
                  placeholder="Evidence URL (optional)" 
                  value={testEvidence}
                  onChange={(e) => setTestEvidence(e.target.value)}
                  style={{ padding: "0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                />
              </div>
              <textarea 
                placeholder="Remarks / Notes (optional)" 
                value={testRemarks}
                onChange={(e) => setTestRemarks(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", marginBottom: "1rem", minHeight: "60px", resize: "vertical" }}
              />
              <Button variant="outline" size="sm" onClick={handleRecordTest} disabled={testLoading || !testDesc || !testResStr || !testOutcome}>
                {testLoading ? "Recording..." : "Record Test"}
              </Button>
            </div>
          )}
        </Card>

        <Card title="Outcomes & Impact" subtitle="Track patents, publications, and deployment results" style={{ gridColumn: "1 / -1" }}>
          {outcomes.length === 0 ? (
             <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>No outcomes recorded yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
              {outcomes.map(outcome => (
                <div key={outcome.id} style={{ display: "flex", justifyContent: "space-between", padding: "1rem", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)" }}>
                  <div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{outcome.title}</span>
                      <StatusBadge status={outcome.status} />
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                      <strong>Type:</strong> {outcome.outcome_type}
                    </div>
                    {outcome.reference_document_url && (
                      <a href={outcome.reference_document_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", color: "var(--color-primary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                        <Icon name="link" size={12} /> View Reference Document
                      </a>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {new Date(outcome.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {canUpdateStatus && (
            <div style={{ padding: "1rem", backgroundColor: "var(--bg-muted)", borderRadius: "var(--radius-md)" }}>
              <h5 style={{ margin: "0 0 1rem", fontSize: "0.9rem" }}>Add Outcome</h5>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <input 
                  type="text" 
                  placeholder="Outcome Title (e.g., Patent Filed, Research Paper)" 
                  value={outcomeTitle}
                  onChange={(e) => setOutcomeTitle(e.target.value)}
                  style={{ padding: "0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                />
                <select
                  value={outcomeType}
                  onChange={(e) => setOutcomeType(e.target.value)}
                  style={{ padding: "0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                >
                  <option value="PATENT">PATENT</option>
                  <option value="COPYRIGHT">COPYRIGHT</option>
                  <option value="DESIGN">DESIGN</option>
                  <option value="PUBLICATION">PUBLICATION</option>
                  <option value="STARTUP_SPINOFF">STARTUP SPINOFF</option>
                  <option value="TECH_TRANSFER">TECH TRANSFER</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <input 
                  type="text" 
                  placeholder="Status (e.g., FILED, GRANTED, PUBLISHED)" 
                  value={outcomeStatus}
                  onChange={(e) => setOutcomeStatus(e.target.value)}
                  style={{ padding: "0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                />
                <input 
                  type="text" 
                  placeholder="Reference Document URL" 
                  value={outcomeRefUrl}
                  onChange={(e) => setOutcomeRefUrl(e.target.value)}
                  style={{ padding: "0.5rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleAddOutcome} disabled={outcomeLoading || !outcomeTitle || !outcomeType || !outcomeStatus}>
                {outcomeLoading ? "Adding..." : "Add Outcome"}
              </Button>
            </div>
          )}
        </Card>

        <Card title="Activity Timeline" subtitle="Audit trail of project actions" style={{ gridColumn: "1 / -1" }}>
          {activity.length === 0 ? (
             <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No activity recorded yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {activity.map(act => (
                <div key={act.id} style={{ display: "flex", gap: "1rem", fontSize: "0.85rem", padding: "0.5rem", borderBottom: "1px solid var(--border-color)" }}>
                  <div style={{ minWidth: "120px", color: "var(--text-muted)" }}>{new Date(act.created_at).toLocaleString()}</div>
                  <div style={{ fontWeight: 600, minWidth: "150px" }}>{act.action}</div>
                  <div>{act.message}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
