import { useState, useEffect } from "react";
import { Icon } from "../common/Icons";
import { Button } from "../common/Button";
import { Card } from "../common/Cards";
import { StatusBadge } from "../common/Badges";
import { Modal } from "../common/Modal";
import { MatchScoreIndicator } from "../common/ProgressBar";
import { solutionApi, problemApi, implementationApi } from "../../services/api";
import { useAuth } from "../../context/useAuth.js";
import { useToast } from "../../context/useToast.js";
import { useTranslation } from "../../context/useTranslation.js";

const SUBMISSION_ALLOWED_ROLES = ["STUDENT", "RESEARCHER", "STARTUP", "MSME", "UNIVERSITY"];
const EVALUATION_ALLOWED_ROLES = ["AUTHORITY", "ADMIN"];

const EVALUATION_DIMENSIONS = [
  { key: "impact_score", label: "Impact", weight: "25% (x5)", desc: "Extent of problem resolution and citizen well-being improvement" },
  { key: "feasibility_score", label: "Feasibility & Technology", weight: "20% (x4)", desc: "Technical maturity, deployability in local geography" },
  { key: "cost_efficiency_score", label: "Cost Efficiency", weight: "15% (x3)", desc: "Capital & operational expenditure vs expected benefits" },
  { key: "scalability_score", label: "Scalability", weight: "15% (x3)", desc: "Ease of expansion to neighboring districts and clusters" },
  { key: "evidence_score", label: "Evidence & Validation", weight: "15% (x3)", desc: "Rigorous empirical proof-of-concept, lab testing, or pilot data" },
  { key: "risk_score", label: "Risk Mitigation", weight: "10% (x2)", desc: "Environmental, socio-political, and operational contingency buffers" },
];

export function SolutionsView({ problemId, problem, onProblemUpdated }) {
  const { role, user } = useAuth();
  const toast = useToast();
  const { language } = useTranslation();
  const isHi = language === "hi";

  const [activeTab, setActiveTab] = useState("all"); // "all" | "ranked"
  const [loading, setLoading] = useState(true);
  const [solutions, setSolutions] = useState([]);
  const [rankedSolutions, setRankedSolutions] = useState([]);
  const [error, setError] = useState("");

  // Submit Solution Modal
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [solutionForm, setSolutionForm] = useState({
    title: "",
    description: "",
    methodology: "",
    technology: "",
    expected_impact: "",
    estimated_cost: "",
    implementation_time: "",
    scalability: "",
    required_resources: "",
    risks: "",
    evidence: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Check size (25MB max)
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size exceeds 25MB limit");
      return;
    }

    const allowedTypes = ["application/pdf", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".pdf") && !file.name.endsWith(".ppt") && !file.name.endsWith(".pptx")) {
      toast.error("Only PDF, PPT, and PPTX files are supported");
      return;
    }

    setSelectedFile(file);
  };

  // Evaluate Modal (Authority / Admin)
  const [evaluateModalOpen, setEvaluateModalOpen] = useState(false);
  const [selectedSolutionForEval, setSelectedSolutionForEval] = useState(null);
  const [evalScores, setEvalScores] = useState({
    impact_score: 4,
    feasibility_score: 4,
    cost_efficiency_score: 4,
    scalability_score: 4,
    evidence_score: 3,
    risk_score: 4,
  });
  const [evalRecommendation, setEvalRecommendation] = useState("RECOMMENDED");
  const [evalComments, setEvalComments] = useState("");
  const [submittingEval, setSubmittingEval] = useState(false);

  // Status Change Modal (Authority / Admin)
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedSolutionForStatus, setSelectedSolutionForStatus] = useState(null);
  const [targetStatus, setTargetStatus] = useState("UNDER_EVALUATION");
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Select Solution & Hand Over to MSMEs/Startups Modal (Authority / Admin)
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [selectedSolutionForHandover, setSelectedSolutionForHandover] = useState(null);
  const [handoverForm, setHandoverForm] = useState({
    partnerType: "ALL_STARTUPS_MSMES",
    selectedPartnerId: "",
    budgetAllocated: "180000",
    pilotTimelineDays: "45",
    handoverNotes: "",
  });
  const [submittingHandover, setSubmittingHandover] = useState(false);

  // MSME & Startup Multi-Media Upload State (Max 5 Images, Max 2 Videos)
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedVideos, setUploadedVideos] = useState([]);

  // Enterprise Proof & Media Submission Modal (Startups / MSMEs)
  const [adoptModalOpen, setAdoptModalOpen] = useState(false);
  const [selectedSolutionForAdopt, setSelectedSolutionForAdopt] = useState(null);
  const [adoptNotes, setAdoptNotes] = useState("");
  const [adoptImages, setAdoptImages] = useState([]);
  const [adoptVideos, setAdoptVideos] = useState([]);
  const [submittingAdopt, setSubmittingAdopt] = useState(false);

  // Full Media Preview Lightbox Modal
  const [previewMediaModal, setPreviewMediaModal] = useState({ open: false, url: "", type: "image", title: "" });

  // Authority Close Problem Modal
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [selectedSolutionForClose, setSelectedSolutionForClose] = useState(null);
  const [closureNote, setClosureNote] = useState("Field verification completed. MSME deliverables and execution proofs inspected on site. Problem officially closed and resolved.");
  const [submittingClose, setSubmittingClose] = useState(false);

  const handleImagesUpload = (e, isAdopt = false) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const currentList = isAdopt ? adoptImages : uploadedImages;
    const setList = isAdopt ? setAdoptImages : setUploadedImages;

    if (currentList.length + files.length > 5) {
      toast.error(isHi ? "अधिकतम 5 छवियां ही अपलोड की जा सकती हैं" : "Maximum of 5 images can be uploaded");
      return;
    }
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        setList((prev) => {
          if (prev.length >= 5) return prev;
          return [...prev, { name: file.name, size: file.size, type: file.type, data: evt.target.result }];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideosUpload = (e, isAdopt = false) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const currentList = isAdopt ? adoptVideos : uploadedVideos;
    const setList = isAdopt ? setAdoptVideos : setUploadedVideos;

    if (currentList.length + files.length > 2) {
      toast.error(isHi ? "अधिकतम 2 वीडियो ही अपलोड किए जा सकते हैं" : "Maximum of 2 videos can be uploaded");
      return;
    }
    files.forEach((file) => {
      if (!file.type.startsWith("video/") && !file.name.endsWith(".mp4") && !file.name.endsWith(".webm") && !file.name.endsWith(".mov")) {
        toast.error(`${file.name} is not a supported video file (MP4, WEBM, MOV)`);
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        toast.error(`Video ${file.name} exceeds 25MB limit`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        setList((prev) => {
          if (prev.length >= 2) return prev;
          return [...prev, { name: file.name, size: file.size, type: file.type, data: evt.target.result }];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  // Registered demo Startups and MSMEs for assignment
  const availablePartners = [
    { id: 4, name: "AquaTech Solutions", type: "STARTUP", specialty: "IoT Sensor Monitoring & Hydro-Engineering" },
    { id: 5, name: "EcoFilter Works", type: "MSME", specialty: "Modular Water Filtration & Civic Infrastructure Fabrication" },
  ];

  const canSubmit = SUBMISSION_ALLOWED_ROLES.includes(role);
  const canEvaluate = EVALUATION_ALLOWED_ROLES.includes(role);

  const refreshData = async () => {
    if (!problemId) return;
    try {
      const [allRes, rankRes] = await Promise.all([
        solutionApi.getSolutionsForProblem(problemId, { limit: 50 }).catch(() => ({ solutions: [] })),
        solutionApi.getRankedSolutions(problemId).catch(() => ({ ranked_solutions: [] })),
      ]);
      setSolutions(allRes.solutions || []);
      setRankedSolutions(rankRes.ranked_solutions || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load solutions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setSolutions([]);
    setRankedSolutions([]);
    setError("");

    async function loadInitial() {
      if (!problemId) {
        setLoading(false);
        return;
      }
      try {
        const [allRes, rankRes] = await Promise.all([
          solutionApi.getSolutionsForProblem(problemId, { limit: 50 }).catch(() => ({ solutions: [] })),
          solutionApi.getRankedSolutions(problemId).catch(() => ({ ranked_solutions: [] })),
        ]);
        if (!ignore) {
          setSolutions(allRes.solutions || []);
          setRankedSolutions(rankRes.ranked_solutions || []);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError(err.message || "Failed to load solutions");
          setLoading(false);
        }
      }
    }
    loadInitial();
    return () => {
      ignore = true;
    };
  }, [problemId]);

  // Pre-fill demo scenario solution if empty
  const handlePrefillScenario = () => {
    setSolutionForm({
      title: "Solar-Powered Multi-Stage Hydro-Filtration & Biochar Remediation",
      description:
        "Modular decentralized groundwater remediation plant utilizing dual-stage activated biochar adsorption, electrocoagulation for heavy metal settling, and UV sterilization powered by local photovoltaic arrays.",
      methodology:
        "Subterranean extraction piped through 3-stage filtration: (1) Gravel sediment filter, (2) Activated bamboo biochar adsorption chamber, (3) Solar UV disinfection. Zero chemical additive byproduct.",
      technology: "Activated Biochar, Solar Photovoltaic (2kW), Electrocoagulation Cell, IoT Turbidity & TDS Sensors",
      expected_impact:
        "Reduces groundwater TDS from 1400ppm to <250ppm, eliminates industrial heavy metals, supplying potable water to 500+ residents.",
      estimated_cost: "250000",
      implementation_time: "45 Days",
      scalability: "Modular containerized skid design deployable to any village borewell with 48 hours setup.",
      required_resources: "Land parcel (15x15 ft), community water point access, 2 trained local pump operators.",
      risks: "Filter media replacement required bi-annually; local village water committee trained for maintenance.",
      evidence: "Field tested in Bokaro industrial belt (Lab Report #CS-2026-W09).",
    });
  };

  const handleSubmitSolution = async (e) => {
    e.preventDefault();
    if (!solutionForm.title.trim() || !solutionForm.description.trim()) {
      toast.error("Title and description are required");
      return;
    }
    if ((role === "STUDENT" || role === "UNIVERSITY") && !selectedFile) {
      toast.error("Please upload a solution document (PDF/PPT/PPTX)");
      return;
    }
    setSubmitting(true);
    try {
      let uploadedUrl = solutionForm.evidence;

      if (selectedFile) {
        setUploadProgress(10);
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(selectedFile);
        });

        const base64Data = await base64Promise;
        setUploadProgress(50);

        const uploadRes = await problemApi.uploadEvidence({
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileData: base64Data
        });

        uploadedUrl = uploadRes.file_url;
        setUploadProgress(100);
      }

      // Upload student solution attached images (up to 5)
      const studentImages = [];
      for (const img of uploadedImages) {
        if (img.data) {
          const res = await problemApi.uploadEvidence({
            fileName: img.name,
            fileType: img.type,
            fileData: img.data,
          });
          studentImages.push(res.file_url);
        }
      }

      // Upload student solution attached videos (up to 2)
      const studentVideos = [];
      for (const vid of uploadedVideos) {
        if (vid.data) {
          const res = await problemApi.uploadEvidence({
            fileName: vid.name,
            fileType: vid.type,
            fileData: vid.data,
          });
          studentVideos.push(res.file_url);
        }
      }

      await solutionApi.createSolution(problemId, {
        title: solutionForm.title.trim(),
        description: solutionForm.description.trim(),
        methodology: solutionForm.methodology.trim() || undefined,
        technology: solutionForm.technology.trim() || undefined,
        expected_impact: solutionForm.expected_impact.trim() || undefined,
        estimated_cost: solutionForm.estimated_cost ? Number(solutionForm.estimated_cost) : undefined,
        implementation_time: solutionForm.implementation_time.trim() || undefined,
        scalability: solutionForm.scalability.trim() || undefined,
        required_resources: solutionForm.required_resources.trim() || undefined,
        risks: solutionForm.risks.trim() || undefined,
        evidence: uploadedUrl || undefined,
        images: studentImages,
        videos: studentVideos,
      });
      toast.success("Solution submitted successfully for municipal evaluation");
      setSubmitModalOpen(false);
      setSolutionForm({
        title: "",
        description: "",
        methodology: "",
        technology: "",
        expected_impact: "",
        estimated_cost: "",
        implementation_time: "",
        scalability: "",
        required_resources: "",
        risks: "",
        evidence: "",
      });
      setSelectedFile(null);
      setUploadedImages([]);
      setUploadedVideos([]);
      setUploadProgress(0);
      refreshData();
    } catch (err) {
      toast.error(err.message || "Failed to submit solution");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Evaluate Modal
  const handleOpenEvaluate = (solution) => {
    setSelectedSolutionForEval(solution);
    setEvalScores({
      impact_score: 4,
      feasibility_score: 4,
      cost_efficiency_score: 4,
      scalability_score: 4,
      evidence_score: 3,
      risk_score: 4,
    });
    setEvalRecommendation("RECOMMENDED");
    setEvalComments("");
    setEvaluateModalOpen(true);
  };

  // Calculate dynamic preview composite score (Formula: Impact*5 + Feasibility*4 + Cost*3 + Scalability*3 + Evidence*3 + Risk*2)
  const previewComposite =
    evalScores.impact_score * 5 +
    evalScores.feasibility_score * 4 +
    evalScores.cost_efficiency_score * 3 +
    evalScores.scalability_score * 3 +
    evalScores.evidence_score * 3 +
    evalScores.risk_score * 2;

  // Submit Evaluation
  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    if (!selectedSolutionForEval) return;
    setSubmittingEval(true);
    try {
      await solutionApi.submitEvaluation(selectedSolutionForEval.id, {
        impact_score: Number(evalScores.impact_score),
        feasibility_score: Number(evalScores.feasibility_score),
        cost_efficiency_score: Number(evalScores.cost_efficiency_score),
        scalability_score: Number(evalScores.scalability_score),
        evidence_score: Number(evalScores.evidence_score),
        risk_score: Number(evalScores.risk_score),
        recommendation: evalRecommendation,
        comments: evalComments.trim() || undefined,
      });
      toast.success("Multidimensional evaluation submitted successfully");
      setEvaluateModalOpen(false);
      refreshData();
    } catch (err) {
      toast.error(err.message || "Evaluation failed");
    } finally {
      setSubmittingEval(false);
    }
  };

  // Open Status Modal
  const handleOpenStatus = (solution) => {
    setSelectedSolutionForStatus(solution);
    if (solution.status === "SUBMITTED") setTargetStatus("UNDER_EVALUATION");
    else if (solution.status === "UNDER_EVALUATION") setTargetStatus("EVALUATED");
    else if (solution.status === "EVALUATED") setTargetStatus("APPROVED");
    else if (solution.status === "APPROVED") setTargetStatus("EXECUTION_SUBMITTED");
    else if (solution.status === "EXECUTION_SUBMITTED") setTargetStatus("CLOSED");
    else setTargetStatus(solution.status);
    setStatusModalOpen(true);
  };

  // Submit Status Change
  const handleSubmitStatus = async (e) => {
    e.preventDefault();
    if (!selectedSolutionForStatus) return;
    setSubmittingStatus(true);
    try {
      await solutionApi.updateSolutionStatus(selectedSolutionForStatus.id, {
        status: targetStatus,
      });

      if (targetStatus === "APPROVED") {
        await problemApi.updateProblemStatus(problemId, {
          status: "APPROVED",
          note: `Solution #${selectedSolutionForStatus.id} status updated to APPROVED by Authority.`,
        }).catch(err => console.warn("Problem status sync warning:", err));
      } else if (targetStatus === "CLOSED") {
        await problemApi.updateProblemStatus(problemId, {
          status: "CLOSED",
          note: `Problem and solution closed by Municipal Authority.`,
        }).catch(err => console.warn("Problem status sync warning:", err));
      }

      setSolutions((prev) =>
        prev.map((s) => (s.id === selectedSolutionForStatus.id ? { ...s, status: targetStatus } : s))
      );

      toast.success(`Solution status updated to ${targetStatus}`);
      setStatusModalOpen(false);
      refreshData();
      if (onProblemUpdated) onProblemUpdated();
    } catch (err) {
      toast.error(err.message || "Status update failed");
    } finally {
      setSubmittingStatus(false);
    }
  };

  // Open Select Solution & Hand Over Modal
  const handleOpenSelectSolution = (solution) => {
    setSelectedSolutionForHandover(solution);
    setHandoverForm({
      partnerType: "ALL_STARTUPS_MSMES",
      selectedPartnerId: "",
      budgetAllocated: String(solution.estimated_cost || 180000),
      pilotTimelineDays: "45",
      handoverNotes: `Solution idea approved by Municipal Authority. Priority granted to registered Startups and MSMEs for field pilot execution.`,
    });
    setSelectModalOpen(true);
  };

  // Submit Solution Selection & Handover to MSMEs / Startups
  const handleSubmitHandover = async (e) => {
    e.preventDefault();
    if (!selectedSolutionForHandover) return;
    setSubmittingHandover(true);
    try {
      // 1. Advance solution status to APPROVED
      await solutionApi.updateSolutionStatus(selectedSolutionForHandover.id, {
        status: "APPROVED",
      });

      // 2. Advance parent problem status to APPROVED
      await problemApi.updateProblemStatus(problemId, {
        status: "APPROVED",
        note: `Student solution idea "${selectedSolutionForHandover.title}" verified and selected by Municipal Authority. Transferred to MSMEs & Startups for pilot execution.`,
      }).catch((err) => console.warn("Problem status sync notice:", err));

      // 3. Initiate pilot implementation project (non-fatal)
      const partnerObj = availablePartners.find((p) => String(p.id) === String(handoverForm.selectedPartnerId));
      const targetPartnerId = partnerObj ? partnerObj.id : null;
      const partnerName = partnerObj ? `${partnerObj.name} (${partnerObj.type})` : "Open to Registered Startups & MSMEs";

      await implementationApi.createImplementationForSolution(selectedSolutionForHandover.id, {
        title: `Execution: ${selectedSolutionForHandover.title}`,
        description: handoverForm.handoverNotes || `Municipal Pilot Project based on approved student solution idea #${selectedSolutionForHandover.id}`,
        partner_id: targetPartnerId,
        partner_name: partnerName,
        budget_allocated: Number(handoverForm.budgetAllocated) || 0,
        target_start_date: new Date().toISOString().split("T")[0],
        target_end_date: new Date(Date.now() + (Number(handoverForm.pilotTimelineDays) || 45) * 24 * 3600 * 1000).toISOString().split("T")[0],
        location_details: "Municipal jurisdiction field testing site",
      }).catch((err) => {
        console.warn("Implementation initiation notice:", err);
      });

      // Immediate optimistic update
      setSolutions((prev) =>
        prev.map((s) => (s.id === selectedSolutionForHandover.id ? { ...s, status: "APPROVED" } : s))
      );

      toast.success(
        isHi
          ? "छात्र समाधान विचार सत्यापित एवं चयनित! स्टार्टअप्स और एमएसएमई को सौंप दिया गया।"
          : "Student solution idea verified & approved! Handed over to Startups & MSMEs."
      );
      setSelectModalOpen(false);
      refreshData();
      if (onProblemUpdated) onProblemUpdated();
    } catch (err) {
      toast.error(err.message || "Failed to select and hand over solution");
    } finally {
      setSubmittingHandover(false);
    }
  };

  // Open MSME / Startup Deliverables & Proofs Upload Modal
  const handleOpenAdopt = (solution) => {
    setSelectedSolutionForAdopt(solution);
    setAdoptNotes(`Field deployment initiated for "${solution.title}". Fabricated components installed and performance monitored.`);
    setAdoptImages([]);
    setAdoptVideos([]);
    setAdoptModalOpen(true);
  };

  // Submit MSME / Startup Deliverables (max 5 images, max 2 videos)
  const handleSubmitAdopt = async (e) => {
    e.preventDefault();
    if (!selectedSolutionForAdopt) return;
    setSubmittingAdopt(true);
    try {
      // Upload execution images (max 5)
      const uploadedImgUrls = [];
      for (const img of adoptImages) {
        if (img.data) {
          const res = await problemApi.uploadEvidence({
            fileName: img.name,
            fileType: img.type,
            fileData: img.data,
          });
          uploadedImgUrls.push(res.file_url);
        }
      }

      // Upload execution videos (max 2)
      const uploadedVidUrls = [];
      for (const vid of adoptVideos) {
        if (vid.data) {
          const res = await problemApi.uploadEvidence({
            fileName: vid.name,
            fileType: vid.type,
            fileData: vid.data,
          });
          uploadedVidUrls.push(res.file_url);
        }
      }

      const executionData = {
        partner_name: user?.name || "AquaTech Solutions (Startup)",
        partner_type: role || "STARTUP",
        notes: adoptNotes.trim() || "Field implementation executed with verified evidence deliverables.",
        images: uploadedImgUrls,
        videos: uploadedVidUrls,
        created_at: new Date().toISOString(),
      };

      // 1. Advance problem status to EXECUTION_SUBMITTED
      await problemApi.updateProblemStatus(problemId, {
        status: "EXECUTION_SUBMITTED",
        note: `Startup/MSME ${user?.name || "Partner"} uploaded execution deliverables (${uploadedImgUrls.length} images, ${uploadedVidUrls.length} videos). Ready for Municipal Authority closure.`,
      }).catch((err) => console.warn("Problem status sync notice:", err));

      // 2. Advance solution status to EXECUTION_SUBMITTED
      await solutionApi.updateSolutionStatus(selectedSolutionForAdopt.id, {
        status: "EXECUTION_SUBMITTED",
      }).catch((err) => console.warn("Solution status sync notice:", err));

      // 3. Optimistic local update
      setSolutions((prev) =>
        prev.map((s) =>
          s.id === selectedSolutionForAdopt.id
            ? { ...s, status: "EXECUTION_SUBMITTED", msme_execution: executionData }
            : s
        )
      );

      toast.success(
        isHi
          ? "कार्यान्वयन साक्ष्य सफलतापूर्वक अपलोड किए गए! नगर निगम प्राधिकरण अब समस्या को बंद कर सकता है।"
          : "Execution proofs uploaded successfully! Municipal Authority can now review and close the problem."
      );
      setAdoptModalOpen(false);
      refreshData();
      if (onProblemUpdated) onProblemUpdated();
    } catch (err) {
      toast.error(err.message || "Failed to submit execution proofs");
    } finally {
      setSubmittingAdopt(false);
    }
  };

  // Open Municipal Authority Close Problem Modal
  const handleOpenCloseSolution = (solution) => {
    setSelectedSolutionForClose(solution);
    setClosureNote("Field verification completed. MSME deliverables and execution proofs inspected on site. Problem officially closed and resolved.");
    setCloseModalOpen(true);
  };

  // Confirm Problem Closure by Authority
  const handleConfirmClose = async (e) => {
    e.preventDefault();
    if (!selectedSolutionForClose) return;
    setSubmittingClose(true);
    try {
      await solutionApi.updateSolutionStatus(selectedSolutionForClose.id, {
        status: "CLOSED",
      });
      await problemApi.updateProblemStatus(problemId, {
        status: "CLOSED",
        note: closureNote.trim() || "Problem officially closed by Municipal Authority.",
      }).catch((err) => console.warn("Problem status sync notice:", err));

      setSolutions((prev) =>
        prev.map((s) => (s.id === selectedSolutionForClose.id ? { ...s, status: "CLOSED" } : s))
      );

      toast.success(
        isHi
          ? "समस्या को नगर निगम प्राधिकरण द्वारा औपचारिक रूप से बंद कर दिया गया!"
          : "Problem officially verified, resolved, and closed by Municipal Authority!"
      );
      setCloseModalOpen(false);
      refreshData();
      if (onProblemUpdated) onProblemUpdated();
    } catch (err) {
      toast.error(err.message || "Failed to close problem");
    } finally {
      setSubmittingClose(false);
    }
  };

  let displayList = activeTab === "ranked" ? rankedSolutions : solutions;
  if (role === "STUDENT" && user) {
    displayList = displayList.filter(sol => Number(sol.submitter_id || sol.submitted_by) === Number(user.id));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Pending Authority Problem Verification Alert */}
      {(problem?.status === "REPORTED" || problem?.status === "UNDER_REVIEW") && (
        <div
          style={{
            backgroundColor: "#fffbeb",
            border: "1.5px solid #fde68a",
            borderRadius: "var(--radius-lg)",
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Icon name="alert-triangle" size={22} color="#b45309" />
            <div>
              <div style={{ fontWeight: 700, color: "#92400e", fontSize: "0.95rem" }}>
                Problem Verification Pending
              </div>
              <div style={{ color: "#b45309", fontSize: "0.85rem" }}>
                {canEvaluate
                  ? "This problem must be verified by the Municipal Authority before student ideas can be officially selected and handed over to Startups/MSMEs."
                  : "This civic problem was recently reported by a citizen. You can submit solution ideas; official Municipal verification and selection will proceed shortly."}
              </div>
            </div>
          </div>
          {canEvaluate && (
            <Button
              variant="primary"
              size="sm"
              icon="check-circle"
              style={{ backgroundColor: "#15803d", borderColor: "#15803d", fontWeight: 700 }}
              onClick={async () => {
                try {
                  await problemApi.updateProblemStatus(problemId, {
                    status: "VERIFIED",
                    note: "Problem verified by Municipal Authority. Confirmed jurisdiction and opened for student solution ideation.",
                  });
                  toast.success("Problem successfully verified by Municipal Authority!");
                  if (onProblemUpdated) onProblemUpdated();
                } catch (e) {
                  toast.error(e.message || "Failed to verify problem");
                }
              }}
            >
              Verify Problem Now
            </Button>
          )}
        </div>
      )}

      {/* Header & Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
              Proposed Solutions & Multidimensional Evaluation
            </h3>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "0.15rem 0.5rem",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-muted)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-color)",
              }}
            >
            </span>
          </div>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Academic, research & innovation proposals evaluated on 6 statutory criteria (Impact, Feasibility, Cost, Scalability, Evidence, Risk)
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {/* Submissions button (Role restricted) */}
          {canSubmit ? (
            <Button
              variant="primary"
              icon="plus-circle"
              onClick={() => {
                setSubmitModalOpen(true);
                if (!solutionForm.title) handlePrefillScenario();
              }}
            >
              Submit Solution Proposal
            </Button>
          ) : (
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                backgroundColor: "var(--bg-muted)",
                padding: "0.4rem 0.65rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-color)",
              }}
            >
              Solution submission is restricted to Academic & Innovation accounts (University, Student, Researcher, Startup, MSME).
            </div>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "0.5rem",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.85rem",
            fontWeight: 600,
            borderRadius: "var(--radius-sm)",
            border: "none",
            backgroundColor: activeTab === "all" ? "var(--color-primary)" : "transparent",
            color: activeTab === "all" ? "#ffffff" : "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          All Solutions ({solutions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ranked")}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.85rem",
            fontWeight: 600,
            borderRadius: "var(--radius-sm)",
            border: "none",
            backgroundColor: activeTab === "ranked" ? "var(--color-primary)" : "transparent",
            color: activeTab === "ranked" ? "#ffffff" : "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span>🏆</span> Ranked & Evaluated ({rankedSolutions.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <Card style={{ textAlign: "center", padding: "3rem" }}>
          <Icon name="spinner" size={28} color="var(--color-primary)" />
          <p style={{ margin: "0.75rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Loading solution proposals...
          </p>
        </Card>
      ) : error ? (
        <Card style={{ backgroundColor: "var(--color-danger-subtle)", color: "var(--color-danger)" }}>
          {error}
        </Card>
      ) : displayList.length === 0 ? (
        <Card
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            backgroundColor: "var(--bg-muted)",
            border: "1px dashed var(--border-color)",
            borderRadius: "var(--radius-xl)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "#ffffff",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <Icon name="check-circle" size={24} />
          </div>
          <h4 style={{ margin: "0 0 0.35rem", fontSize: "1.1rem" }}>
            {activeTab === "ranked"
              ? "No Evaluated Solutions Yet"
              : (role === "STUDENT" ? "You haven't submitted any solutions yet" : "No Solutions Submitted Yet")}
          </h4>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.875rem", color: "var(--text-muted)", maxWidth: "420px" }}>
            {activeTab === "ranked"
              ? "Municipal authorities evaluate submitted solutions across the 6 normalized dimensions to generate deterministic composite rankings."
              : ((role === "STUDENT" || role === "UNIVERSITY")
                ? "Propose your solution idea by uploading a document (PDF/PPT/PPTX). You don't need to provide a complete business plan."
                : "Registered universities, research labs, student teams, and startups can submit technical proposals to solve this civic challenge.")}
          </p>
          {canSubmit && (
            <Button
              variant="primary"
              icon="plus-circle"
              onClick={() => {
                setSubmitModalOpen(true);
                handlePrefillScenario();
              }}
            >
              Submit Solution Proposal
            </Button>
          )}
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {displayList.map((sol, index) => {
            const hasScore =
              (sol.average_score !== undefined && sol.average_score !== null) ||
              (sol.composite_score !== undefined && sol.composite_score !== null);
            const scoreNum = Number(sol.average_score ?? sol.composite_score ?? 0);

            return (
              <div
                key={sol.id}
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-xl)",
                  padding: "2rem",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                  transition: "all var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary-border)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                }}
              >
                {/* Solution Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                      {activeTab === "ranked" && (
                        <span
                          style={{
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            padding: "0.2rem 0.5rem",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor:
                              index === 0
                                ? "rgba(234, 179, 8, 0.15)"
                                : index === 1
                                  ? "rgba(148, 163, 184, 0.2)"
                                  : "rgba(180, 83, 9, 0.15)",
                            color:
                              index === 0
                                ? "#a16207"
                                : index === 1
                                  ? "#475569"
                                  : "#9a3412",
                          }}
                        >
                          #{index + 1} Ranked
                        </span>
                      )}
                      <StatusBadge status={sol.status} />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        Submitted by: <strong>{sol.submitter_name || sol.organization_name || "Academic Contributor"}</strong>
                      </span>
                    </div>

                    <h4 style={{ margin: "0.25rem 0 0", fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.01em" }}>
                      {sol.title}
                    </h4>

                    {/* Authority Selection & MSME/Startup Handover Banner */}
                    {(sol.status === "APPROVED" || sol.status === "PILOT") && (
                      <div
                        style={{
                          marginTop: "0.6rem",
                          padding: "0.65rem 0.95rem",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "#f0fdf4",
                          border: "1px solid #86efac",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "1.2rem" }}>🏛️</span>
                          <div>
                            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#166534" }}>
                              {isHi ? "नगर निगम द्वारा चयनित — स्टार्टअप्स / एमएसएमई को सौंपा गया" : "Selected by Municipal Authority — Handed Over to MSMEs & Startups"}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#15803d" }}>
                              {isHi
                                ? "पायलट प्रोटोटाइप, अनुबंध और धरातल पर परिनियोजन के लिए अनुमोदित।"
                                : "Approved for prototyping, contracting, and pilot field deployment."}
                            </div>
                          </div>
                        </div>

                        {(role === "STARTUP" || role === "MSME") && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon="rocket"
                            onClick={() => handleStartupAdopt(sol)}
                            style={{ backgroundColor: "#15803d", borderColor: "#15803d" }}
                          >
                            {isHi ? "पायलट निष्पादन स्वीकार करें" : "Adopt & Execute Pilot"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Composite Score Pill if Evaluated */}
                  {hasScore ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        backgroundColor: "var(--bg-muted)",
                        padding: "0.5rem 0.85rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                          Composite Score
                        </div>
                        <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--color-primary)" }}>
                          {scoreNum.toFixed(1)} <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>/ 100</span>
                        </div>
                      </div>
                      <MatchScoreIndicator score={scoreNum} />
                    </div>
                  ) : (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        backgroundColor: "var(--bg-muted)",
                        padding: "0.3rem 0.6rem",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      Pending Evaluation
                    </span>
                  )}
                </div>

                {/* Description */}
                <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {sol.description}
                </p>

                {/* Specs Grid (Hidden for Students and Universities) */}
                {role !== "STUDENT" && role !== "UNIVERSITY" && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "0.75rem",
                      padding: "0.85rem",
                      backgroundColor: "var(--bg-muted)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "0.8rem",
                    }}
                  >
                    {sol.technology && (
                      <div>
                        <div style={{ color: "var(--text-muted)", fontWeight: 600 }}>TECHNOLOGY</div>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: "0.15rem" }}>
                          {sol.technology}
                        </div>
                      </div>
                    )}

                    {sol.estimated_cost !== null && sol.estimated_cost !== undefined && (
                      <div>
                        <div style={{ color: "var(--text-muted)", fontWeight: 600 }}>ESTIMATED COST</div>
                        <div style={{ fontWeight: 700, color: "var(--color-primary)", marginTop: "0.15rem" }}>
                          ₹{Number(sol.estimated_cost).toLocaleString("en-IN")}
                        </div>
                      </div>
                    )}

                    {sol.implementation_time && (
                      <div>
                        <div style={{ color: "var(--text-muted)", fontWeight: 600 }}>TIMELINE</div>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: "0.15rem" }}>
                          {sol.implementation_time}
                        </div>
                      </div>
                    )}

                    {sol.scalability && (
                      <div>
                        <div style={{ color: "var(--text-muted)", fontWeight: 600 }}>SCALABILITY</div>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: "0.15rem" }}>
                          {sol.scalability}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Methodology Details if available (Hidden for Students and Universities) */}
                {role !== "STUDENT" && role !== "UNIVERSITY" && sol.methodology && (
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    <strong>Methodology:</strong> {sol.methodology}
                  </div>
                )}

                {/* Expected Impact (Hidden for Students and Universities) */}
                {role !== "STUDENT" && role !== "UNIVERSITY" && sol.expected_impact && (
                  <div style={{ fontSize: "0.85rem", color: "var(--color-success)" }}>
                    <strong>Expected Impact:</strong> {sol.expected_impact}
                  </div>
                )}

                {/* Uploaded Document / Evidence */}
                {sol.evidence && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <a
                      href={sol.evidence.startsWith("http") ? sol.evidence : `http://localhost:5000${sol.evidence.startsWith("/") ? "" : "/"}${sol.evidence}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        padding: "0.5rem 0.8rem",
                        backgroundColor: "var(--color-primary-subtle)",
                        color: "var(--color-primary)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        textDecoration: "none",
                        border: "1px solid var(--color-primary-border)",
                      }}
                    >
                      <Icon name="file-text" size={16} />
                      View Uploaded Document
                    </a>
                  </div>
                )}

                {/* Student Innovation Proposal Attached Media (Images & Videos) */}
                {((sol.images && sol.images.length > 0) || (sol.videos && sol.videos.length > 0)) && (
                  <div style={{ borderTop: "1px dashed var(--border-color)", paddingTop: "0.75rem" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                      📸 Student Proposal Technical Media & Diagrams
                    </div>
                    {sol.images && sol.images.length > 0 && (
                      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                        {sol.images.map((imgUrl, i) => (
                          <div
                            key={i}
                            onClick={() => setPreviewMediaModal({ open: true, url: imgUrl, type: "image", title: `Proposal Diagram ${i + 1}` })}
                            style={{
                              width: "72px",
                              height: "72px",
                              borderRadius: "var(--radius-md)",
                              overflow: "hidden",
                              border: "1px solid var(--border-color)",
                              cursor: "pointer",
                              boxShadow: "var(--shadow-xs)",
                            }}
                          >
                            <img
                              src={imgUrl.startsWith("http") ? imgUrl : `http://localhost:5000${imgUrl.startsWith("/") ? "" : "/"}${imgUrl}`}
                              alt={`Diagram ${i + 1}`}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {sol.videos && sol.videos.length > 0 && (
                      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        {sol.videos.map((vidUrl, vi) => (
                          <video
                            key={vi}
                            controls
                            src={vidUrl.startsWith("http") ? vidUrl : `http://localhost:5000${vidUrl.startsWith("/") ? "" : "/"}${vidUrl}`}
                            style={{ maxHeight: "180px", maxWidth: "100%", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* MSME / Startup Field Execution & Deliverables Section */}
                {(sol.msme_execution || sol.status === "EXECUTION_SUBMITTED" || sol.status === "CLOSED") && (
                  <div
                    style={{
                      border: "1.5px solid #86efac",
                      borderRadius: "var(--radius-lg)",
                      padding: "1rem 1.25rem",
                      backgroundColor: "#f0fdf4",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.2rem" }}>🚀</span>
                        <div style={{ fontWeight: 800, color: "#166534", fontSize: "0.95rem" }}>
                          MSME & Startup Field Execution Deliverables
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "0.25rem 0.6rem",
                          borderRadius: "var(--radius-full)",
                          backgroundColor: "#dcfce7",
                          color: "#15803d",
                          border: "1px solid #86efac",
                        }}
                      >
                        Executed by: {sol.msme_execution?.partner_name || "AquaTech Solutions (Startup)"}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.85rem", color: "#166534", lineHeight: 1.5 }}>
                      {sol.msme_execution?.notes || "Physical pilot implementation and on-ground deployment completed with engineering telemetry and photo verification."}
                    </div>

                    {/* MSME Execution Photo Gallery (Max 5 Images) */}
                    {sol.msme_execution?.images && sol.msme_execution.images.length > 0 && (
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#166534", marginBottom: "0.4rem" }}>
                          Field Execution Photos ({sol.msme_execution.images.length}/5)
                        </div>
                        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                          {sol.msme_execution.images.map((imgUrl, mi) => (
                            <div
                              key={mi}
                              onClick={() => setPreviewMediaModal({ open: true, url: imgUrl, type: "image", title: `Execution Proof Photo ${mi + 1}` })}
                              style={{
                                width: "80px",
                                height: "80px",
                                borderRadius: "var(--radius-md)",
                                overflow: "hidden",
                                border: "1.5px solid #86efac",
                                cursor: "pointer",
                                boxShadow: "var(--shadow-sm)",
                              }}
                            >
                              <img
                                src={imgUrl.startsWith("http") ? imgUrl : `http://localhost:5000${imgUrl.startsWith("/") ? "" : "/"}${imgUrl}`}
                                alt={`Proof ${mi + 1}`}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* MSME Execution Videos (Max 2 Videos) */}
                    {sol.msme_execution?.videos && sol.msme_execution.videos.length > 0 && (
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#166534", marginBottom: "0.4rem" }}>
                          Field Verification Video Deliverables ({sol.msme_execution.videos.length}/2)
                        </div>
                        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                          {sol.msme_execution.videos.map((vidUrl, mvi) => (
                            <video
                              key={mvi}
                              controls
                              src={vidUrl.startsWith("http") ? vidUrl : `http://localhost:5000${vidUrl.startsWith("/") ? "" : "/"}${vidUrl}`}
                              style={{ maxHeight: "200px", maxWidth: "100%", borderRadius: "var(--radius-md)", border: "1px solid #86efac" }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Authority Evaluation Breakdown if present */}
                {((sol.evaluations && sol.evaluations.length > 0) || sol.dimension_averages) && (
                  <div
                    style={{
                      borderTop: "1px solid var(--border-color)",
                      paddingTop: "0.75rem",
                    }}
                  >
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                      STATUTORY EVALUATION CRITERIA BREAKDOWN
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                        gap: "0.5rem",
                      }}
                    >
                      {EVALUATION_DIMENSIONS.map((dim) => {
                        const dimKeyClean = dim.key.replace("_score", "");
                        const val =
                          sol.dimension_averages && sol.dimension_averages[dimKeyClean] !== undefined
                            ? sol.dimension_averages[dimKeyClean]
                            : sol.evaluations?.[0]?.[dim.key];
                        return (
                          <div
                            key={dim.key}
                            style={{
                              padding: "0.5rem",
                              backgroundColor: "#ffffff",
                              border: "1px solid var(--border-color)",
                              borderRadius: "var(--radius-sm)",
                            }}
                          >
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{dim.label}</div>
                            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-primary)" }}>
                              {val ? `${val} / 5` : "N/A"}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {sol.evaluations[0]?.comments && (
                      <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                        &ldquo;{sol.evaluations[0]?.comments}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                {/* Actions Bar for Authority / Admin */}
                {canEvaluate && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: "0.75rem",
                      borderTop: "1px solid var(--border-color)",
                      paddingTop: "0.75rem",
                      flexWrap: "wrap",
                    }}
                  >
                    {sol.status !== "APPROVED" && sol.status !== "CLOSED" && sol.status !== "EXECUTION_SUBMITTED" && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon="award"
                        onClick={() => handleOpenSelectSolution(sol)}
                        style={{ backgroundColor: "#15803d", borderColor: "#15803d", fontWeight: 700 }}
                      >
                        {isHi ? "✓ छात्र समाधान सत्यापित एवं चयनित करें (स्टार्टअप्स को सौंपें)" : "✓ Verify & Select Student Idea (Hand Over to MSMEs/Startups)"}
                      </Button>
                    )}
                    {(sol.status === "APPROVED" || sol.status === "EXECUTION_SUBMITTED") && (
                      <>
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
                          ✓ Selected by Authority • Handed to MSMEs/Startups
                        </span>
                        <Button
                          variant="primary"
                          size="sm"
                          icon="check-circle"
                          onClick={() => handleOpenCloseSolution(sol)}
                          style={{ backgroundColor: "#059669", borderColor: "#059669", fontWeight: 700 }}
                        >
                          {isHi ? "🏁 समस्या बंद करें (सत्यापन पूर्ण)" : "🏁 Close Problem (Resolution Verified)"}
                        </Button>
                      </>
                    )}
                    {sol.status === "CLOSED" && (
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
                        🏁 Problem Officially Closed & Resolved
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      icon="activity"
                      onClick={() => handleOpenStatus(sol)}
                    >
                      Update Lifecycle Status
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon="check-circle"
                      onClick={() => handleOpenEvaluate(sol)}
                    >
                      Score / Evaluate Solution
                    </Button>
                  </div>
                )}

                {/* Actions Bar for Startups / MSMEs if solution is approved */}
                {(role === "STARTUP" || role === "MSME") && (sol.status === "APPROVED" || sol.status === "EXECUTION_SUBMITTED") && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      gap: "0.75rem",
                      borderTop: "1px solid var(--border-color)",
                      paddingTop: "0.75rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <Button
                      variant="primary"
                      size="sm"
                      icon="rocket"
                      onClick={() => handleOpenAdopt(sol)}
                      style={{ backgroundColor: "#15803d", borderColor: "#15803d", fontWeight: 700 }}
                    >
                      {isHi ? "🚀 निष्पादन साक्ष्य व मीडिया अपलोड करें (अधिकतम 5 चित्र, 2 वीडियो)" : "🚀 Upload Execution Proofs & Media (Max 5 Images, 2 Videos)"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Solution Proposal Modal */}
      <Modal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        title={isHi ? "समाधान प्रस्ताव जमा करें" : "Submit Solution Proposal"}
      >
        <form onSubmit={handleSubmitSolution}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {isHi ? "प्रस्तुतकर्ता भूमिका:" : "Submitting as:"} <strong>{role}</strong>
            </span>
            <button
              type="button"
              onClick={handlePrefillScenario}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-primary)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {isHi ? "डेमो डेटा भरें" : "Fill Demo Scenario Data"}
            </button>
          </div>

          <div className="cs-form-group" style={{ marginBottom: "1.25rem" }}>
            <label className="cs-label" style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.45rem", display: "block" }}>
              {isHi ? "समाधान का शीर्षक" : "Solution Title"} <span className="required">*</span>
            </label>
            <input
              type="text"
              className="cs-input cs-input-large"
              placeholder={isHi ? "उदा. कम लागत वाली IoT आधारित जल गुणवत्ता निगरानी प्रणाली" : "e.g., Low-cost IoT-based water quality monitoring system"}
              value={solutionForm.title}
              onChange={(e) => setSolutionForm({ ...solutionForm, title: e.target.value })}
              required
              style={{
                width: "100%",
                minHeight: "56px",
                fontSize: "1.15rem",
                padding: "1rem 1.25rem",
                borderRadius: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div className="cs-form-group" style={{ marginBottom: "1.25rem" }}>
            <label className="cs-label" style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.45rem", display: "block" }}>
              {isHi ? "समाधान का विस्तृत विवरण" : "Solution Description & Working Concept"} <span className="required">*</span>
            </label>
            <textarea
              className="cs-textarea cs-textarea-large"
              rows={8}
              placeholder={isHi ? "अपने प्रस्तावित समाधान की कार्यप्रणाली, तकनीकी दृष्टिकोण और यह समस्या का समाधान कैसे करता है, विस्तार से बताएं..." : "Explain your proposed technical methodology, engineering components, expected civic improvements, and deployment requirements..."}
              value={solutionForm.description}
              onChange={(e) => setSolutionForm({ ...solutionForm, description: e.target.value })}
              required
              style={{
                width: "100%",
                minHeight: "200px",
                fontSize: "1.05rem",
                lineHeight: 1.65,
                padding: "1.1rem 1.25rem",
                borderRadius: "14px",
                boxSizing: "border-box",
                resize: "vertical",
              }}
            />
          </div>

          <div className="cs-form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <label className="cs-label" style={{ margin: 0 }}>
                Solution Document <span className="required">*</span>
              </label>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Slide 1: Title\nSlide 2: Problem Understanding\nSlide 3: Proposed Solution\nSlide 4: How It Works\nSlide 5: Expected Benefits\nSlide 6: Team & Skills");
                }}
                style={{ fontSize: "0.75rem", color: "var(--color-primary)", textDecoration: "underline" }}
              >
                Need a format? View Solution Template
              </a>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              Upload your solution presentation or PDF. Accepted: PDF, PPT, PPTX (Max 25MB)
            </div>

            <input
              type="file"
              accept=".pdf,.ppt,.pptx"
              onChange={handleFileChange}
              style={{ display: "block", marginBottom: "0.5rem" }}
              required={role === "STUDENT" || role === "UNIVERSITY"}
            />
            {selectedFile && (
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Selected: <strong>{selectedFile.name}</strong> ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </div>
            )}
          </div>

          {/* Technical Diagrams & Image Uploads (Max 5 Images) */}
          <div className="cs-form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <label className="cs-label" style={{ margin: 0 }}>
                Technical Diagrams & Photos (Max 5 Images)
              </label>
              <span style={{ fontSize: "0.75rem", color: uploadedImages.length >= 5 ? "var(--color-danger)" : "var(--text-muted)" }}>
                {uploadedImages.length} / 5 images uploaded
              </span>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImagesUpload(e, false)}
              disabled={uploadedImages.length >= 5}
              style={{ display: "block", marginBottom: "0.5rem" }}
            />
            {uploadedImages.length > 0 && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                {uploadedImages.map((img, idx) => (
                  <div key={idx} style={{ position: "relative", width: "64px", height: "64px", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border-color)" }}>
                    <img src={img.data} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={() => setUploadedImages((prev) => prev.filter((_, i) => i !== idx))}
                      style={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        backgroundColor: "rgba(0,0,0,0.65)",
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "11px",
                        lineHeight: 1,
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prototype Demonstration Videos (Max 2 Videos) */}
          <div className="cs-form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <label className="cs-label" style={{ margin: 0 }}>
                Prototype Demonstration Videos (Max 2 Videos)
              </label>
              <span style={{ fontSize: "0.75rem", color: uploadedVideos.length >= 2 ? "var(--color-danger)" : "var(--text-muted)" }}>
                {uploadedVideos.length} / 2 videos uploaded
              </span>
            </div>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              multiple
              onChange={(e) => handleVideosUpload(e, false)}
              disabled={uploadedVideos.length >= 2}
              style={{ display: "block", marginBottom: "0.5rem" }}
            />
            {uploadedVideos.length > 0 && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                {uploadedVideos.map((vid, vIdx) => (
                  <div key={vIdx} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0.6rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-muted)", fontSize: "0.75rem" }}>
                    <span>🎥 {vid.name} ({(vid.size / (1024 * 1024)).toFixed(1)}MB)</span>
                    <button
                      type="button"
                      onClick={() => setUploadedVideos((prev) => prev.filter((_, i) => i !== vIdx))}
                      style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer", fontWeight: 800 }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {role !== "STUDENT" && role !== "UNIVERSITY" && (
            <>
              <div className="cs-grid-2">
                <div className="cs-form-group">
                  <label className="cs-label">Technology & Tools</label>
                  <input
                    type="text"
                    className="cs-input"
                    placeholder="e.g., Activated Biochar, IoT Turbidity Sensors, UV"
                    value={solutionForm.technology}
                    onChange={(e) => setSolutionForm({ ...solutionForm, technology: e.target.value })}
                  />
                </div>

                <div className="cs-form-group">
                  <label className="cs-label">Estimated Budget (INR)</label>
                  <input
                    type="number"
                    className="cs-input"
                    placeholder="250000"
                    min="0"
                    value={solutionForm.estimated_cost}
                    onChange={(e) => setSolutionForm({ ...solutionForm, estimated_cost: e.target.value })}
                  />
                </div>
              </div>

              <div className="cs-grid-2">
                <div className="cs-form-group">
                  <label className="cs-label">Execution Timeline</label>
                  <input
                    type="text"
                    className="cs-input"
                    placeholder="e.g., 45 Days"
                    value={solutionForm.implementation_time}
                    onChange={(e) => setSolutionForm({ ...solutionForm, implementation_time: e.target.value })}
                  />
                </div>

                <div className="cs-form-group">
                  <label className="cs-label">Scalability Potential</label>
                  <input
                    type="text"
                    className="cs-input"
                    placeholder="e.g., Modular containerized skid"
                    value={solutionForm.scalability}
                    onChange={(e) => setSolutionForm({ ...solutionForm, scalability: e.target.value })}
                  />
                </div>
              </div>

              <div className="cs-form-group">
                <label className="cs-label">Technical Methodology</label>
                <textarea
                  className="cs-textarea"
                  rows={2}
                  placeholder="Step-by-step technical implementation stages..."
                  value={solutionForm.methodology}
                  onChange={(e) => setSolutionForm({ ...solutionForm, methodology: e.target.value })}
                />
              </div>

              <div className="cs-form-group">
                <label className="cs-label">Expected Civic Impact</label>
                <input
                  type="text"
                  className="cs-input"
                  placeholder="e.g., Supplies potable drinking water to 500+ residents; reduces TDS to <250ppm"
                  value={solutionForm.expected_impact}
                  onChange={(e) => setSolutionForm({ ...solutionForm, expected_impact: e.target.value })}
                />
              </div>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubmitModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Submit for Authority Evaluation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Evaluate Solution Modal (Authority / Admin) */}
      <Modal
        isOpen={evaluateModalOpen}
        onClose={() => setEvaluateModalOpen(false)}
        title="Statutory Multidimensional Evaluation"
      >
        <form onSubmit={handleSubmitEvaluation}>
          <div style={{ marginBottom: "1rem" }}>
            <h5 style={{ margin: "0 0 0.25rem", fontSize: "1rem" }}>
              {selectedSolutionForEval?.title}
            </h5>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Rate each dimension from 1 (Poor) to 5 (Outstanding). The composite score is calculated deterministically.
            </div>
          </div>

          {/* Dynamic Score Calculator Callout */}
          <div
            style={{
              padding: "0.75rem",
              backgroundColor: "var(--color-primary-subtle)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-primary-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-primary)" }}>
                CALCULATED COMPOSITE SCORE:
              </span>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-primary)" }}>
                {previewComposite} / 100
              </div>
            </div>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "0.25rem 0.6rem",
                borderRadius: "var(--radius-sm)",
                backgroundColor: previewComposite >= 75 ? "var(--color-success)" : "var(--color-warning)",
                color: "#ffffff",
              }}
            >
              {previewComposite >= 75 ? "EXCELLENT CANDIDATE" : "ACCEPTABLE"}
            </span>
          </div>

          {/* Sliders / Inputs for 6 dimensions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {EVALUATION_DIMENSIONS.map((dim) => (
              <div
                key={dim.key}
                style={{
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "var(--bg-muted)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                    {dim.label} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>({dim.weight})</span>
                  </span>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-primary)" }}>
                    {evalScores[dim.key]} / 5
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  style={{ width: "100%", accentColor: "var(--color-primary)" }}
                  value={evalScores[dim.key]}
                  onChange={(e) =>
                    setEvalScores({ ...evalScores, [dim.key]: parseInt(e.target.value, 10) })
                  }
                />
              </div>
            ))}
          </div>

          <div className="cs-form-group" style={{ marginTop: "1rem" }}>
            <label className="cs-label">
              Statutory Recommendation <span className="required">*</span>
            </label>
            <select
              className="cs-select"
              value={evalRecommendation}
              onChange={(e) => setEvalRecommendation(e.target.value)}
            >
              <option value="RECOMMENDED">RECOMMENDED (Proceed toward Pilot deployment)</option>
              <option value="CONSIDER">CONSIDER (Requires minor modifications/budget review)</option>
              <option value="NOT_RECOMMENDED">NOT_RECOMMENDED (Insufficient feasibility or high risk)</option>
            </select>
          </div>

          <div className="cs-form-group">
            <label className="cs-label">Evaluator Comments / Review Directives</label>
            <textarea
              className="cs-textarea"
              rows={2}
              placeholder="e.g., Excellent technical feasibility with proven biochar adsorption; low capital overhead."
              value={evalComments}
              onChange={(e) => setEvalComments(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEvaluateModalOpen(false)}
              disabled={submittingEval}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingEval}>
              Record Statutory Evaluation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Status Modal (Authority / Admin) */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update Solution Status"
      >
        <form onSubmit={handleSubmitStatus}>
          <div className="cs-form-group">
            <label className="cs-label">
              Select Target Status <span className="required">*</span>
            </label>
            <select
              className="cs-select"
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
            >
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="UNDER_EVALUATION">UNDER_EVALUATION</option>
              <option value="EVALUATED">EVALUATED</option>
              <option value="APPROVED">APPROVED (Selected by Authority & Handed Over)</option>
              <option value="EXECUTION_SUBMITTED">EXECUTION_SUBMITTED (MSME Proofs Submitted)</option>
              <option value="CLOSED">CLOSED (Closed & Resolved by Authority)</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStatusModalOpen(false)}
              disabled={submittingStatus}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submittingStatus}>
              Update Status
            </Button>
          </div>
        </form>
      </Modal>

      {/* Select Solution Idea & Hand Over to MSMEs/Startups Modal */}
      <Modal
        isOpen={selectModalOpen}
        onClose={() => setSelectModalOpen(false)}
        title={isHi ? "छात्र समाधान विचार सत्यापन एवं चयन (स्टार्टअप्स को हस्तांतरण)" : "Verify & Select Student Idea (Hand Over to MSMEs/Startups)"}
      >
        <form onSubmit={handleSubmitHandover}>
          {selectedSolutionForHandover && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Proposal Summary Box */}
              <div
                style={{
                  padding: "0.85rem 1rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-muted)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  Selected Student Innovation Proposal
                </div>
                <h4 style={{ margin: "0.25rem 0 0.35rem", fontSize: "1rem", color: "var(--text-primary)" }}>
                  {selectedSolutionForHandover.title}
                </h4>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Proposed by: <strong>{selectedSolutionForHandover.submitter_name || "Student Innovator"}</strong> &bull; Estimated Cost: <strong>₹{Number(selectedSolutionForHandover.estimated_cost || 180000).toLocaleString("en-IN")}</strong>
                </div>
              </div>

              {/* Handover Directive */}
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #86efac",
                  fontSize: "0.8rem",
                  color: "#166534",
                }}
              >
                ℹ️ Selecting this solution will automatically advance the parent problem to <strong>APPROVED/PILOT</strong> status and transition the project into the MSME & Startup execution pipeline.
              </div>

              {/* Partner Assignment Option */}
              <div className="cs-form-group">
                <label className="cs-label" style={{ fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                  Implementation Partner Assignment <span className="required">*</span>
                </label>
                <select
                  className="cs-select"
                  value={handoverForm.selectedPartnerId}
                  onChange={(e) => setHandoverForm({ ...handoverForm, selectedPartnerId: e.target.value })}
                  style={{ width: "100%", padding: "0.6rem", borderRadius: "var(--radius-md)" }}
                >
                  <option value="">Open to All Registered Startups & MSMEs (Competitive Expression of Interest)</option>
                  {availablePartners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      Direct Assign: {partner.name} ({partner.type}) — {partner.specialty}
                    </option>
                  ))}
                </select>
              </div>

              {/* Budget Allocation & Timeline */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div className="cs-form-group">
                  <label className="cs-label" style={{ fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                    Allocated Pilot Budget (₹)
                  </label>
                  <input
                    type="number"
                    className="cs-input"
                    value={handoverForm.budgetAllocated}
                    onChange={(e) => setHandoverForm({ ...handoverForm, budgetAllocated: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "var(--radius-md)" }}
                  />
                </div>

                <div className="cs-form-group">
                  <label className="cs-label" style={{ fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                    Pilot Target Duration (Days)
                  </label>
                  <input
                    type="number"
                    className="cs-input"
                    value={handoverForm.pilotTimelineDays}
                    onChange={(e) => setHandoverForm({ ...handoverForm, pilotTimelineDays: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "var(--radius-md)" }}
                  />
                </div>
              </div>

              {/* Handover Directives / Notes */}
              <div className="cs-form-group">
                <label className="cs-label" style={{ fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                  Municipal Directives & Technical Scope
                </label>
                <textarea
                  className="cs-textarea"
                  rows={2}
                  value={handoverForm.handoverNotes}
                  onChange={(e) => setHandoverForm({ ...handoverForm, handoverNotes: e.target.value })}
                  placeholder="e.g., Fabricate modular skid units, install telemetry flow meters, and conduct 30-day baseline testing."
                  style={{ width: "100%", padding: "0.6rem", borderRadius: "var(--radius-md)" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectModalOpen(false)}
                  disabled={submittingHandover}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={submittingHandover}
                  style={{ backgroundColor: "#15803d", borderColor: "#15803d" }}
                >
                  Confirm Selection & Hand Over
                </Button>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Enterprise Proof & Media Submission Modal (Startups / MSMEs) */}
      <Modal
        isOpen={adoptModalOpen}
        onClose={() => setAdoptModalOpen(false)}
        title={isHi ? "स्टार्टअप / एमएसएमई निष्पादन साक्ष्य एवं मीडिया अपलोड" : "Upload Enterprise Execution Proofs & Media"}
      >
        <form onSubmit={handleSubmitAdopt}>
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
              🚀 <strong>Field Execution Deliverables:</strong> Upload up to 5 photos and up to 2 videos demonstrating on-ground fabrication, installation, or baseline operational testing.
            </div>

            {selectedSolutionForAdopt && (
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Executing Solution Idea: <strong>{selectedSolutionForAdopt.title}</strong>
              </div>
            )}

            <div className="cs-form-group">
              <label className="cs-label" style={{ fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                Execution Directives, Methodology & Deployment Details <span className="required">*</span>
              </label>
              <textarea
                className="cs-textarea"
                rows={3}
                required
                value={adoptNotes}
                onChange={(e) => setAdoptNotes(e.target.value)}
                placeholder="Explain the on-ground execution details, telemetry metrics, and deliverables completed..."
                style={{ width: "100%", padding: "0.6rem", borderRadius: "var(--radius-md)" }}
              />
            </div>

            {/* Images Upload (Max 5) */}
            <div className="cs-form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                <label className="cs-label" style={{ margin: 0, fontWeight: 600 }}>
                  Field Execution Photos (Max 5 Images)
                </label>
                <span style={{ fontSize: "0.75rem", color: adoptImages.length >= 5 ? "var(--color-danger)" : "var(--text-muted)" }}>
                  {adoptImages.length} / 5 images uploaded
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImagesUpload(e, true)}
                disabled={adoptImages.length >= 5}
                style={{ display: "block", marginBottom: "0.4rem" }}
              />
              {adoptImages.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
                  {adoptImages.map((img, idx) => (
                    <div key={idx} style={{ position: "relative", width: "68px", height: "68px", borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border-color)" }}>
                      <img src={img.data} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button
                        type="button"
                        onClick={() => setAdoptImages((prev) => prev.filter((_, i) => i !== idx))}
                        style={{
                          position: "absolute",
                          top: 2,
                          right: 2,
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(0,0,0,0.65)",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          lineHeight: 1,
                        }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Videos Upload (Max 2) */}
            <div className="cs-form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                <label className="cs-label" style={{ margin: 0, fontWeight: 600 }}>
                  Field Verification Videos (Max 2 Videos)
                </label>
                <span style={{ fontSize: "0.75rem", color: adoptVideos.length >= 2 ? "var(--color-danger)" : "var(--text-muted)" }}>
                  {adoptVideos.length} / 2 videos uploaded
                </span>
              </div>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                multiple
                onChange={(e) => handleVideosUpload(e, true)}
                disabled={adoptVideos.length >= 2}
                style={{ display: "block", marginBottom: "0.4rem" }}
              />
              {adoptVideos.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
                  {adoptVideos.map((vid, vIdx) => (
                    <div key={vIdx} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.35rem 0.6rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-muted)", fontSize: "0.75rem" }}>
                      <span>🎥 {vid.name} ({(vid.size / (1024 * 1024)).toFixed(1)}MB)</span>
                      <button
                        type="button"
                        onClick={() => setAdoptVideos((prev) => prev.filter((_, i) => i !== vIdx))}
                        style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer", fontWeight: 800 }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdoptModalOpen(false)}
                disabled={submittingAdopt}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submittingAdopt}
                style={{ backgroundColor: "#15803d", borderColor: "#15803d" }}
              >
                Submit Execution Deliverables
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Municipal Authority Close Problem Modal */}
      <Modal
        isOpen={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        title={isHi ? "समस्या समाधान सत्यापन एवं औपचारिक समापन" : "Municipal Resolution Verification & Problem Closure"}
      >
        <form onSubmit={handleConfirmClose}>
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
              🏁 <strong>Official Problem Closure:</strong> Municipal Authority verifies that on-ground implementation deliverables by registered Startups/MSMEs are complete, and closes the problem ticket.
            </div>

            {selectedSolutionForClose && (
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                <div>Selected Solution: <strong>{selectedSolutionForClose.title}</strong></div>
                {selectedSolutionForClose.msme_execution && (
                  <div>Partner Execution: <strong>{selectedSolutionForClose.msme_execution.partner_name}</strong> ({selectedSolutionForClose.msme_execution.images?.length || 0} photos, {selectedSolutionForClose.msme_execution.videos?.length || 0} videos)</div>
                )}
              </div>
            )}

            <div className="cs-form-group">
              <label className="cs-label" style={{ fontWeight: 600, display: "block", marginBottom: "0.4rem" }}>
                Authority Verification Remarks & Closure Directive <span className="required">*</span>
              </label>
              <textarea
                className="cs-textarea"
                rows={3}
                required
                value={closureNote}
                onChange={(e) => setClosureNote(e.target.value)}
                style={{ width: "100%", padding: "0.6rem", borderRadius: "var(--radius-md)" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCloseModalOpen(false)}
                disabled={submittingClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={submittingClose}
                style={{ backgroundColor: "#059669", borderColor: "#059669" }}
              >
                Confirm Resolution & Close Problem
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Full Media Preview Lightbox Modal */}
      {previewMediaModal.open && (
        <Modal
          isOpen={previewMediaModal.open}
          onClose={() => setPreviewMediaModal({ open: false, url: "", type: "image", title: "" })}
          title={previewMediaModal.title || "Media Preview"}
        >
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "1rem" }}>
            {previewMediaModal.type === "video" ? (
              <video
                controls
                autoPlay
                src={previewMediaModal.url.startsWith("http") ? previewMediaModal.url : `http://localhost:5000${previewMediaModal.url.startsWith("/") ? "" : "/"}${previewMediaModal.url}`}
                style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: "var(--radius-md)" }}
              />
            ) : (
              <img
                src={previewMediaModal.url.startsWith("http") ? previewMediaModal.url : `http://localhost:5000${previewMediaModal.url.startsWith("/") ? "" : "/"}${previewMediaModal.url}`}
                alt="preview"
                style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "var(--radius-md)" }}
              />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
