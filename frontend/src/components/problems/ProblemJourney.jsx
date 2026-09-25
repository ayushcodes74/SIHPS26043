import { useState, useEffect } from "react";
import { Icon } from "../common/Icons";
import { Button } from "../common/Button";
import { StatusBadge } from "../common/Badges";
import { Modal } from "../common/Modal";
import { problemApi, solutionApi, implementationApi } from "../../services/api";
import { useAuth } from "../../context/useAuth.js";
import { useToast } from "../../context/useToast.js";
import { useTranslation } from "../../context/useTranslation.js";
import { useRouter } from "../../context/useRouter.js";

export function ProblemJourney({ problem, onStatusUpdated, onSelectTab }) {
  const { role } = useAuth();
  const toast = useToast();
  const { navigate } = useRouter();
  const { language } = useTranslation();
  const isHi = language === "hi";

  const isAuthorityOrAdmin = role === "AUTHORITY" || role === "ADMIN";
  const isStartupOrMsme = role === "STARTUP" || role === "MSME";

  const [solutions, setSolutions] = useState([]);
  const [implementations, setImplementations] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  // Fetch solutions and implementations for this problem to compute accurate state
  useEffect(() => {
    let ignore = false;
    setSolutions([]);
    setImplementations([]);

    async function loadData() {
      if (!problem?.id) return;
      try {
        const [solRes, implRes] = await Promise.allSettled([
          solutionApi.getSolutionsForProblem(problem.id, { limit: 20 }),
          implementationApi.getProblemImplementations(problem.id).catch(() => ({ implementations: [] })),
        ]);

        if (!ignore) {
          setSolutions(solRes.status === "fulfilled" && solRes.value?.solutions ? solRes.value.solutions : []);
          setImplementations(implRes.status === "fulfilled" && implRes.value?.implementations ? implRes.value.implementations : []);
        }
      } catch (err) {
        console.error("Error loading problem journey context:", err);
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [problem?.id, problem?.status]);

  const rawStatus = (typeof problem?.status === "string" ? problem.status : "REPORTED").toUpperCase();

  // Find approved or selected solution
  const approvedSolution = solutions.find(
    (s) => s.status === "APPROVED" || s.status === "PILOT" || s.status === "IMPLEMENTING"
  );
  const hasSolutions = solutions.length > 0;
  const activeImplementation = implementations[0] || null;

  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeNote, setCloseNote] = useState("Field verification complete. MSME execution proofs inspected and approved on site. Problem officially closed and resolved.");
  const [closingProblem, setClosingProblem] = useState(false);

  // Normalized status logic
  const isReported = true;
  const isVerified = ["VERIFIED", "ASSIGNED", "ROOT_CAUSE_ANALYSIS", "SOLUTION_SEARCH", "SOLUTION_EVALUATION", "APPROVED", "EXECUTION_SUBMITTED", "CLOSED", "RESOLVED", "PILOT", "IMPLEMENTING"].includes(rawStatus);
  const isUnderReview = rawStatus === "UNDER_REVIEW";

  const isIdeationDone = Boolean(approvedSolution) || hasSolutions || ["APPROVED", "EXECUTION_SUBMITTED", "CLOSED", "RESOLVED"].includes(rawStatus);
  const isIdeationActive = !isIdeationDone && (isVerified || ["ASSIGNED", "ROOT_CAUSE_ANALYSIS", "SOLUTION_SEARCH"].includes(rawStatus));

  const isSelectedByAuthority = Boolean(approvedSolution) || ["APPROVED", "EXECUTION_SUBMITTED", "CLOSED", "RESOLVED"].includes(rawStatus);
  const isSelectionActive = !isSelectedByAuthority && hasSolutions;

  const isHandedOverToStartup = isSelectedByAuthority || Boolean(activeImplementation);
  const isMSMEExecutionDone = ["EXECUTION_SUBMITTED", "CLOSED", "RESOLVED"].includes(rawStatus) || Boolean(activeImplementation?.images?.length || activeImplementation?.evidence_count || approvedSolution?.msme_execution);
  const isStartupHandoverActive = isSelectedByAuthority && !isMSMEExecutionDone;

  const isClosedByAuthority = ["CLOSED", "RESOLVED"].includes(rawStatus);
  const isClosureActive = (isMSMEExecutionDone || isSelectedByAuthority) && !isClosedByAuthority;

  // Streamlined 6-Stage Resolution Journey
  const JOURNEY_STAGES = [
    {
      id: "reported",
      num: 1,
      title: isHi ? "समस्या दर्ज" : "Problem Reported",
      actor: isHi ? "नागरिक" : "Citizen",
      actorBadgeColor: "var(--color-primary)",
      desc: isHi ? "नागरिक द्वारा भू-स्थान और साक्ष्यों के साथ दर्ज" : "Citizen reported with GPS location and evidence",
      isComplete: true,
      isActive: rawStatus === "REPORTED",
      date: problem?.created_at ? new Date(problem.created_at).toLocaleDateString() : "Logged",
    },
    {
      id: "verified",
      num: 2,
      title: isHi ? "सत्यापन एवं अधिकारिता" : "Authority Verification",
      actor: isHi ? "नगर निगम" : "Municipal Authority",
      actorBadgeColor: "#8b5cf6",
      desc: isHi ? "अधिकार क्षेत्र और प्राथमिकता का प्रशासनिक सत्यापन" : "Jurisdiction confirmation & priority validation",
      isComplete: isVerified,
      isActive: isUnderReview,
      date: isVerified ? "Verified" : isUnderReview ? "In Review" : "Pending",
    },
    {
      id: "ideation",
      num: 3,
      title: isHi ? "समाधान विचार प्रस्ताव" : "Solution Ideation",
      actor: isHi ? "छात्र / शोधकर्ता / इनोवेटर्स" : "Students & Researchers",
      actorBadgeColor: "#06b6d4",
      desc: isHi ? "शैक्षणिक और तकनीकी नवाचार प्रस्ताव आमंत्रित" : "Engineering proposals open to universities & solvers",
      isComplete: isIdeationDone,
      isActive: isIdeationActive,
      extra: hasSolutions ? `${solutions.length} ${solutions.length === 1 ? "proposal" : "proposals"}` : "Awaiting proposals",
    },
    {
      id: "selected",
      num: 4,
      title: isHi ? "अधिकारी द्वारा चयनित" : "Selected by Authority",
      actor: isHi ? "नगर निगम" : "Municipal Authority",
      actorBadgeColor: "#f59e0b",
      desc: isHi ? "मूल्यांकन के बाद सर्वश्रेष्ठ समाधान विचार का चयन" : "Authority evaluates and selects the winning solution idea",
      isComplete: isSelectedByAuthority,
      isActive: isSelectionActive,
      highlight: approvedSolution ? approvedSolution.title : null,
      extra: isSelectedByAuthority ? (approvedSolution ? "Selected" : "Solution Approved") : "Evaluation phase",
    },
    {
      id: "startup_handover",
      num: 5,
      title: isHi ? "एमएसएमई / स्टार्टअप्स निष्पादन" : "MSME & Startup Execution",
      actor: isHi ? "स्टार्टअप और एमएसएमई" : "Startups & MSMEs",
      actorBadgeColor: "#10b981",
      desc: isHi ? "फील्ड निष्पादन साक्ष्य (अधिकतम 5 चित्र, 2 वीडियो) अपलोड" : "Execution proofs & media deliverables (max 5 images, 2 videos)",
      isComplete: isMSMEExecutionDone,
      isActive: isStartupHandoverActive,
      partner: activeImplementation?.partner_name || (approvedSolution ? "AquaTech Solutions / EcoFilter Works" : null),
      extra: isMSMEExecutionDone ? "Proofs Uploaded" : isHandedOverToStartup ? "In Execution" : "Pending Handover",
    },
    {
      id: "closed",
      num: 6,
      title: isHi ? "अधिकारी द्वारा बंद" : "Closed by Authority",
      actor: isHi ? "नगर निगम" : "Municipal Authority",
      actorBadgeColor: "#059669",
      desc: isHi ? "एमएसएमई अंतिम अपलोड के बाद नगर निगम द्वारा समाधान सत्यापित व बंद" : "Authority reviews MSME proofs and officially closes problem",
      isComplete: isClosedByAuthority,
      isActive: isClosureActive,
      extra: isClosedByAuthority ? "Problem Closed" : isMSMEExecutionDone ? "Ready to Close" : "Pending Execution",
    },
  ];

  // Authority status transition choices
  const getNextStatuses = () => {
    switch (rawStatus) {
      case "REPORTED":
        return ["UNDER_REVIEW", "VERIFIED", "APPROVED", "CLOSED"];
      case "UNDER_REVIEW":
        return ["VERIFIED", "APPROVED", "REPORTED", "CLOSED"];
      case "VERIFIED":
        return ["SOLUTION_SEARCH", "APPROVED", "CLOSED"];
      case "ASSIGNED":
        return ["SOLUTION_SEARCH", "APPROVED", "CLOSED"];
      case "SOLUTION_SEARCH":
        return ["SOLUTION_EVALUATION", "APPROVED", "CLOSED"];
      case "SOLUTION_EVALUATION":
        return ["APPROVED", "CLOSED"];
      case "APPROVED":
        return ["EXECUTION_SUBMITTED", "CLOSED"];
      case "EXECUTION_SUBMITTED":
        return ["CLOSED", "APPROVED"];
      case "RESOLVED":
        return ["CLOSED"];
      case "CLOSED":
        return [];
      default:
        return ["UNDER_REVIEW", "VERIFIED", "APPROVED", "CLOSED"];
    }
  };

  const handleOpenAdvanceModal = () => {
    const nextList = getNextStatuses();
    if (nextList.length > 0) setSelectedStatus(nextList[0]);
    setNote("");
    setModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus) return;
    setUpdating(true);
    try {
      await problemApi.updateProblemStatus(problem.id, {
        status: selectedStatus,
        note: note.trim() || undefined,
      });
      toast.success(
        isHi
          ? `समस्या की स्थिति को ${selectedStatus} में अद्यतन किया गया`
          : `Problem lifecycle advanced to ${selectedStatus}`
      );
      setModalOpen(false);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      toast.error(err.message || "Failed to update problem status");
    } finally {
      setUpdating(false);
    }
  };

  // Authority Close Problem Handler
  const handleConfirmCloseProblem = async () => {
    setClosingProblem(true);
    try {
      await problemApi.updateProblemStatus(problem.id, {
        status: "CLOSED",
        note: closeNote.trim() || "Problem verified and officially closed by Municipal Authority.",
      });
      if (approvedSolution?.id) {
        await solutionApi.updateSolutionStatus(approvedSolution.id, { status: "CLOSED" }).catch(() => {});
      }
      toast.success(
        isHi
          ? "समस्या को नगर निगम प्राधिकरण द्वारा औपचारिक रूप से सत्यापित एवं बंद कर दिया गया!"
          : "Problem officially verified, resolved, and closed by Municipal Authority!"
      );
      setCloseModalOpen(false);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      toast.error(err.message || "Failed to close problem");
    } finally {
      setClosingProblem(false);
    }
  };

  // Find active step index
  const currentStepDisplay = isClosedByAuthority ? 6 : isMSMEExecutionDone ? 5 : isHandedOverToStartup ? 4 : isIdeationDone ? 3 : isVerified ? 2 : 1;

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-xl)",
        padding: "1.75rem",
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      {/* Header zone with Title, Current Status Badge & Action Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--color-primary-subtle)",
                color: "var(--color-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "0.85rem",
              }}
            >
              ⚡
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {isHi ? "समस्या से स्टार्टअप हस्तांतरण तक की समाधान यात्रा" : "Problem-to-Implementation Resolution Journey"}
            </h3>
            <StatusBadge status={rawStatus} />
          </div>

          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>
            {isHi
              ? `चरण ${currentStepDisplay} / 6: समस्या दर्ज → नगर निगम सत्यापन → विचार प्रस्ताव → अधिकारिता चयन → एमएसएमई निष्पादन साक्ष्य → अधिकारी द्वारा बंद`
              : `Stage ${currentStepDisplay} of 6: Problem Reported → Authority Verification → Solution Proposals → Selected by Authority → MSME Execution Proofs → Closed by Authority`}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Authority Verify & Close Problem Button */}
          {isAuthorityOrAdmin && !isClosedByAuthority && isClosureActive && (
            <Button
              variant="primary"
              size="sm"
              icon="check-circle"
              onClick={() => setCloseModalOpen(true)}
              style={{ backgroundColor: "#059669", borderColor: "#059669", fontWeight: 700 }}
            >
              {isHi ? "🏁 समस्या सत्यापित व बंद करें" : "🏁 Verify & Close Problem"}
            </Button>
          )}

          {isClosedByAuthority && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.35rem 0.75rem",
                backgroundColor: "#dcfce7",
                color: "#15803d",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.8rem",
                fontWeight: 700,
                border: "1px solid #86efac",
              }}
            >
              ✓ Problem Officially Closed & Resolved
            </span>
          )}

          {/* Authority advance modal button */}
          {isAuthorityOrAdmin && !isClosedByAuthority && (
            <Button
              variant="primary"
              size="sm"
              icon="arrow-right"
              onClick={handleOpenAdvanceModal}
            >
              {isHi ? "जीवनचक्र आगे बढ़ाएं" : "Advance Lifecycle"}
            </Button>
          )}

          {/* Quick jump to Solutions tab */}
          {onSelectTab && (
            <>
              {hasSolutions && (
                <Button
                  variant="outline"
                  size="sm"
                  icon="cpu"
                  onClick={() => onSelectTab("solutions")}
                >
                  {isHi ? "समाधान देखें" : "View Solutions"} ({solutions.length})
                </Button>
              )}
              {isHandedOverToStartup && !isClosedByAuthority && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.35rem 0.75rem",
                    backgroundColor: "#dcfce7",
                    color: "#15803d",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    border: "1px solid #86efac",
                  }}
                >
                  ✓ Handed to Startups/MSMEs
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Narrative Progress Bar */}
      <div
        style={{
          width: "100%",
          backgroundColor: "var(--bg-muted)",
          borderRadius: "var(--radius-full)",
          height: "6px",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, Math.max(16, (currentStepDisplay / 6) * 100))}%`,
            background: isClosedByAuthority
              ? "linear-gradient(90deg, #10b981 0%, #059669 100%)"
              : "linear-gradient(90deg, var(--color-primary) 0%, #10b981 100%)",
            transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            borderRadius: "var(--radius-full)",
          }}
        />
      </div>

      {/* Horizontal Steps Carousel / Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          position: "relative",
        }}
      >
        {JOURNEY_STAGES.map((stage) => {
          const isDone = stage.isComplete;
          const isCurrent = stage.isActive;

          let cardBg = "var(--bg-card)";
          let cardBorder = "1px solid var(--border-color)";
          let iconColor = "var(--text-muted)";
          let iconBg = "var(--bg-muted)";

          if (isDone) {
            cardBg = "#f0fdf4";
            cardBorder = "1px solid #86efac";
            iconColor = "#15803d";
            iconBg = "#dcfce7";
          } else if (isCurrent) {
            cardBg = "#eff6ff";
            cardBorder = "2px solid var(--color-primary)";
            iconColor = "var(--color-primary)";
            iconBg = "#dbeafe";
          }

          return (
            <div
              key={stage.id}
              style={{
                backgroundColor: cardBg,
                border: cardBorder,
                borderRadius: "var(--radius-lg)",
                padding: "0.85rem 0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.45rem",
                position: "relative",
                transition: "all var(--transition-fast)",
                boxShadow: isCurrent ? "0 4px 12px rgba(59, 130, 246, 0.15)" : "none",
              }}
            >
              {/* Top Node Indicator & Stage Number */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: iconBg,
                    color: iconColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                  }}
                >
                  {isDone ? "✓" : isCurrent ? "⚡" : stage.num}
                </div>

                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: stage.actorBadgeColor ? `${stage.actorBadgeColor}15` : "var(--bg-muted)",
                    color: stage.actorBadgeColor || "var(--text-muted)",
                  }}
                >
                  {stage.actor}
                </span>
              </div>

              {/* Stage Title */}
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: isCurrent ? "var(--color-primary)" : isDone ? "#166534" : "var(--text-secondary)",
                  lineHeight: 1.25,
                }}
              >
                {stage.title}
              </div>

              {/* Status Note or Extra context */}
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.3 }}>
                {stage.desc}
              </div>

              {/* Dynamic Highlights (Solution Title or Startup Partner) */}
              {stage.highlight && (
                <div
                  style={{
                    marginTop: "auto",
                    padding: "0.35rem 0.5rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "#fef3c7",
                    border: "1px solid #fde68a",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: "#92400e",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={stage.highlight}
                >
                  🏆 {stage.highlight}
                </div>
              )}

              {stage.partner && (
                <div
                  style={{
                    marginTop: "auto",
                    padding: "0.35rem 0.5rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "#e0f2fe",
                    border: "1px solid #bae6fd",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: "#0369a1",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={stage.partner}
                >
                  🚀 {stage.partner}
                </div>
              )}

              {/* Bottom status badge */}
              <div style={{ marginTop: "auto", paddingTop: "0.3rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: isDone ? "#15803d" : isCurrent ? "var(--color-primary)" : "var(--text-muted)",
                  }}
                >
                  {isDone ? "Completed" : isCurrent ? "Active Stage" : stage.extra || "Pending"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contextual Status Announcement Callout */}
      <div
        style={{
          padding: "0.85rem 1.15rem",
          borderRadius: "var(--radius-lg)",
          backgroundColor: isSelectedByAuthority ? "#f0fdf4" : isUnderReview ? "#eff6ff" : "var(--bg-muted)",
          border: isSelectedByAuthority ? "1px solid #86efac" : isUnderReview ? "1px solid #bfdbfe" : "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <Icon
            name={isSelectedByAuthority ? "check-circle" : isUnderReview ? "info" : "activity"}
            size={18}
            color={isSelectedByAuthority ? "#16a34a" : isUnderReview ? "var(--color-primary)" : "var(--text-muted)"}
          />
          <span style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 500 }}>
            {approvedSolution ? (
              <span>
                <strong>{isHi ? "अधिकारी चयन संपन्न:" : "Authority Selection Approved:"}</strong>{" "}
                {isHi
                  ? `समाधान विचार "${approvedSolution.title}" का चयन किया गया है और इसे स्टार्टअप्स / एमएसएमई को फील्ड पायलट निष्पादन के लिए सौंप दिया गया है।`
                  : `Winning solution idea "${approvedSolution.title}" officially selected by Municipal Authority. Transferred to Startups & MSMEs for physical pilot deployment.`}
              </span>
            ) : hasSolutions ? (
              <span>
                <strong>{isHi ? "समाधान समीक्षाधीन:" : "Solutions Under Review:"}</strong>{" "}
                {isHi
                  ? `${solutions.length} अभिनव प्रस्ताव प्राप्त हुए हैं। नगर निगम अधिकारी मूल्यांकन कर रहे हैं। चयन के बाद यह सीधे स्टार्टअप्स को कार्यान्वयन के लिए हस्तांतरित किया जाएगा।`
                  : `${solutions.length} innovation proposals submitted. Municipal Authority is reviewing and scoring. Once selected, it directly advances to Startups & MSMEs for pilot implementation.`}
              </span>
            ) : isVerified ? (
              <span>
                <strong>{isHi ? "समस्या सत्यापित:" : "Problem Authenticated:"}</strong>{" "}
                {isHi
                  ? "नगर निगम ने समस्या की प्रामाणिकता की पुष्टि की है। छात्र और शोधकर्ता अब समाधान विचार प्रस्तुत कर सकते हैं।"
                  : "Municipal Authority has verified ground problem authenticity. Innovators, Students & Researchers can now propose solutions."}
              </span>
            ) : isUnderReview ? (
              <span>
                <strong>{isHi ? "समीक्षाधीन:" : "Under Review:"}</strong>{" "}
                {isHi
                  ? "नगरपालिका दल वर्तमान में स्थल और भौगोलिक अधिकारिता की जांच कर रहा है।"
                  : "Municipal teams are currently investigating the reported location and priority score."}
              </span>
            ) : (
              <span>
                <strong>{isHi ? "समस्या दर्ज:" : "Report Received:"}</strong>{" "}
                {isHi
                  ? "नागरिक रिपोर्ट सुरक्षित रूप से दर्ज कर ली गई है। प्रशासनिक समीक्षा की प्रतीक्षा है।"
                  : "Report logged with verified GPS coordinates and evidence. Queued for municipal review."}
              </span>
            )}
          </span>
        </div>

        {/* Dynamic Action Trigger for Startups / MSMEs */}
        {isStartupOrMsme && isSelectedByAuthority && !isClosedByAuthority && onSelectTab && (
          <Button
            variant="primary"
            size="sm"
            icon="rocket"
            onClick={() => onSelectTab("solutions")}
          >
            {isHi ? "समाधान निष्पादन व साक्ष्य अपलोड करें" : "Execute & Upload Proofs"}
          </Button>
        )}
      </div>

      {/* Advance Modal for Authority */}
      {isAuthorityOrAdmin && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={isHi ? "समस्या जीवनचक्र आगे बढ़ाएं" : "Advance Problem Lifecycle"}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0 }}>
              Current Status: <StatusBadge status={rawStatus} />
            </p>

            <div className="cs-form-group">
              <label className="cs-label" style={{ fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
                Select Next Lifecycle Stage <span className="required">*</span>
              </label>
              <select
                className="cs-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{ width: "100%", padding: "0.65rem", borderRadius: "var(--radius-md)" }}
              >
                {getNextStatuses().map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="cs-form-group">
              <label className="cs-label" style={{ fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
                Administrative Note / Directive
              </label>
              <textarea
                className="cs-textarea"
                rows={3}
                placeholder="e.g., Problem verified by Municipal team. Solution selected and handed over to MSME/Startup partner for field execution."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ width: "100%", padding: "0.65rem", borderRadius: "var(--radius-md)" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <Button variant="outline" onClick={() => setModalOpen(false)} disabled={updating}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleUpdateStatus} loading={updating}>
                Confirm Stage Transition
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Close & Resolve Problem Modal for Authority */}
      {isAuthorityOrAdmin && (
        <Modal
          isOpen={closeModalOpen}
          onClose={() => setCloseModalOpen(false)}
          title={isHi ? "समस्या समाधान सत्यापन एवं औपचारिक समापन" : "Municipal Resolution Verification & Problem Closure"}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                padding: "0.85rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "#f0fdf4",
                border: "1px solid #86efac",
                fontSize: "0.85rem",
                color: "#166534",
              }}
            >
              🏁 <strong>Final Municipal Action:</strong> You are officially verifying that the winning student innovation was executed by registered Startups/MSMEs with on-ground proofs (photos & videos), and closing this civic problem.
            </div>

            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <div><strong>Problem:</strong> {problem?.title}</div>
              {approvedSolution && <div><strong>Winning Idea:</strong> {approvedSolution.title}</div>}
              <div><strong>Executing Enterprise:</strong> {activeImplementation?.partner_name || "Registered Startups & MSMEs"}</div>
            </div>

            <div className="cs-form-group">
              <label className="cs-label" style={{ fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
                Municipal Authority Closure Remarks & Verification Directive <span className="required">*</span>
              </label>
              <textarea
                className="cs-textarea"
                rows={3}
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                placeholder="e.g., Physical site inspection completed. Drain cleared, modular skid operating at capacity. Problem resolved and closed."
                style={{ width: "100%", padding: "0.65rem", borderRadius: "var(--radius-md)" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <Button variant="outline" onClick={() => setCloseModalOpen(false)} disabled={closingProblem}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmCloseProblem}
                loading={closingProblem}
                style={{ backgroundColor: "#059669", borderColor: "#059669" }}
              >
                Confirm Resolution & Close Problem
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
