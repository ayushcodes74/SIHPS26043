import { useState, useRef, useEffect } from "react";
import { Input, Textarea, Select } from "../../components/common/FormControls";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Cards";
import { Icon } from "../../components/common/Icons";
import { AIAnalysisView } from "../../components/problems/AIAnalysisView.jsx";
import { ExpertiseMatchingView } from "../../components/problems/ExpertiseMatchingView.jsx";
import { problemApi, challengeApi, matchingApi } from "../../services/api.js";
import { useToast } from "../../context/useToast.js";
import { useRouter } from "../../context/useRouter.js";
import { useTranslation } from "../../context/useTranslation.js";
import { INDIAN_STATES, INDIAN_STATES_AND_DISTRICTS } from "../../constants/indianLocations.js";

export function ReportProblemPage() {
  const toast = useToast();
  const { navigate } = useRouter();
  const { t, language } = useTranslation();

  // Form State (Citizen-first: Title, Description, Location, Evidence, Category)
  const [form, setForm] = useState({
    title: "",
    description: "",
    state: "",
    district: "",
    city: "",
    specificLocation: "",
    category: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Voice Input (Speech-to-Text) State
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const recognitionRef = useRef(null);

  // Geolocation State
  const [coords, setCoords] = useState(null); // { latitude, longitude }
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState(null); // { type: 'success'|'error'|'info', message }

  // Evidence Files State (Separate Photo & Video)
  const [photos, setPhotos] = useState([]); // [{ id, name, size, type, dataUrl, previewUrl }]
  const [video, setVideo] = useState(null); // { name, size, type, dataUrl, previewUrl }
  const [evidenceError, setEvidenceError] = useState("");
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Result state after submission
  const [createdProblem, setCreatedProblem] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [duplicateCheck, setDuplicateCheck] = useState(null);

  // Clean up object URLs and audio on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      photos.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
      if (video?.previewUrl) {
        URL.revokeObjectURL(video.previewUrl);
      }
    };
  }, [photos, video]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStateChange = (e) => {
    const newState = e.target.value;
    setForm((prev) => ({
      ...prev,
      state: newState,
      district: "", // reset district when state changes
    }));
  };

  // --------------------------------------------------------------------------
  // Voice Input Handler (Speech-to-Text via Web Speech API)
  // --------------------------------------------------------------------------
  const startListening = () => {
    setSpeechError("");
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const msg = t("report.speechUnsupported");
      setSpeechError(msg);
      toast.error(msg);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      // Language-aware speech recognition (hi-IN or en-IN)
      recognition.lang = language === "hi" ? "hi-IN" : "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError("");
      };

      recognition.onresult = (event) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setForm((prev) => {
            const separator =
              prev.description && !prev.description.endsWith(" ") ? " " : "";
            return {
              ...prev,
              description: prev.description + separator + finalTranscript.trim(),
            };
          });
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition notice:", event.error);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          const msg = t("report.speechPermissionDenied");
          setSpeechError(msg);
          toast.error(msg);
        } else if (event.error !== "no-speech") {
          setSpeechError(t("report.speechError"));
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition start failed:", err);
      setSpeechError(t("report.speechError"));
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  };

  // --------------------------------------------------------------------------
  // Geolocation Handler ("Use Current Location")
  // --------------------------------------------------------------------------
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      const msg = t("report.locationUnsupported");
      setLocationStatus({ type: "error", message: msg });
      toast.error(msg);
      return;
    }

    setIsLocating(true);
    setLocationStatus({ type: "info", message: t("report.detectingLocation") });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoords({ latitude: lat, longitude: lng });

        const successMsg = `${t("report.locationDetected")} (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`;
        setLocationStatus({
          type: "success",
          message: successMsg,
        });
        setIsLocating(false);
        toast.success(t("report.locationDetected"));

        // Optional non-blocking reverse lookup helper
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
          { headers: { "Accept-Language": "en" } }
        )
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!data?.address) return;
            const stateFromApi = data.address.state;
            const districtFromApi =
              data.address.state_district || data.address.county || data.address.city;

            // Match with Indian states dataset if present
            if (stateFromApi && INDIAN_STATES_AND_DISTRICTS[stateFromApi]) {
              setForm((prev) => {
                const updated = { ...prev, state: stateFromApi };
                const districts = INDIAN_STATES_AND_DISTRICTS[stateFromApi] || [];
                const matchedDist = districts.find(
                  (d) =>
                    districtFromApi &&
                    d.toLowerCase().includes(districtFromApi.toLowerCase().replace("district", "").trim())
                );
                if (matchedDist) {
                  updated.district = matchedDist;
                }
                return updated;
              });
            }
          })
          .catch(() => {
            // Non-blocking, manual entry is always available
          });
      },
      (geoError) => {
        setIsLocating(false);
        let errorMsg = t("report.locationUnavailable");
        if (geoError.code === 1) {
          errorMsg = t("report.locationDenied");
        } else if (geoError.code === 3) {
          errorMsg = t("report.locationTimeout");
        }
        setLocationStatus({ type: "error", message: errorMsg });
        toast.error(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // --------------------------------------------------------------------------
  // Evidence: Photo Upload Handlers (JPG, JPEG, PNG, WEBP)
  // --------------------------------------------------------------------------
  const handlePhotoSelect = (e) => {
    setEvidenceError("");
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const MAX_SIZE = 25 * 1024 * 1024; // 25MB

    const newPhotos = [];

    files.forEach((file) => {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      const isImg = file.type.startsWith("image/") || allowedExtensions.includes(ext);

      if (!isImg) {
        setEvidenceError(t("report.invalidFileType"));
        return;
      }

      if (file.size > MAX_SIZE) {
        setEvidenceError(t("report.fileTooLarge"));
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      const reader = new FileReader();

      reader.onload = () => {
        newPhotos.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type || "image/jpeg",
          dataUrl: reader.result,
          previewUrl,
        });

        if (newPhotos.length === files.length) {
          setPhotos((prev) => [...prev, ...newPhotos]);
        }
      };

      reader.readAsDataURL(file);
    });

    // Reset input value so same file can be re-selected if removed
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handleRemovePhoto = (photoId) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === photoId);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== photoId);
    });
  };

  // --------------------------------------------------------------------------
  // Evidence: Video Upload Handlers (MP4, WEBM, MOV)
  // --------------------------------------------------------------------------
  const handleVideoSelect = (e) => {
    setEvidenceError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = [".mp4", ".webm", ".mov"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    const isVid = file.type.startsWith("video/") || allowedExtensions.includes(ext);

    if (!isVid) {
      setEvidenceError(t("report.invalidFileType"));
      return;
    }

    const MAX_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_SIZE) {
      setEvidenceError(t("report.fileTooLarge"));
      return;
    }

    if (video?.previewUrl) {
      URL.revokeObjectURL(video.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    const reader = new FileReader();

    reader.onload = () => {
      setVideo({
        name: file.name,
        size: file.size,
        type: file.type || "video/mp4",
        dataUrl: reader.result,
        previewUrl,
      });
    };

    reader.readAsDataURL(file);

    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleRemoveVideo = () => {
    if (video?.previewUrl) URL.revokeObjectURL(video.previewUrl);
    setVideo(null);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // --------------------------------------------------------------------------
  // Problem Submission
  // --------------------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Citizen Form Validations
    if (!form.title.trim()) {
      setError(t("report.validationTitle"));
      return;
    }
    if (!form.description.trim()) {
      setError(t("report.validationDesc"));
      return;
    }
    if (!form.state) {
      setError(t("report.validationState"));
      return;
    }
    if (!form.district) {
      setError(t("report.validationDistrict"));
      return;
    }

    if (isListening) {
      stopListening();
    }

    setLoading(true);
    setError("");

    try {
      // 2. Upload Evidence (prefer video if attached, or primary photo)
      let evidenceData = null;
      const primaryEvidence = video || photos[0];

      if (primaryEvidence) {
        try {
          const uploadRes = await problemApi.uploadEvidence({
            fileName: primaryEvidence.name,
            fileType: primaryEvidence.type,
            fileData: primaryEvidence.dataUrl,
          });
          evidenceData = uploadRes;
        } catch (uploadErr) {
          console.warn("Evidence upload notice:", uploadErr.message);
        }
      }

      // 3. Construct clean Citizen Problem payload
      const addressString = form.specificLocation.trim()
        ? `${form.specificLocation.trim()}, ${form.state}`
        : form.state;

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category || null,
        district: form.district,
        city: form.city.trim() || null,
        address: addressString,
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
        evidence_url: evidenceData?.file_url || null,
        evidence_type: evidenceData?.file_type || null,
        evidence_name: evidenceData?.file_name || null,
        evidence_size: evidenceData?.file_size || null,
      };

      // 4. Submit Problem to Real Backend API
      const problemRes = await problemApi.createProblem(payload);
      setCreatedProblem(problemRes.problem);
      setAiAnalysis(problemRes.ai_analysis);
      setDuplicateCheck(problemRes.duplicate_check);

      toast.success(t("report.successToast"));
    } catch (err) {
      console.error("Submission failed:", err);
      setError(err.message || "Failed to submit problem.");
      toast.error(err.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCreatedProblem(null);
    setAiAnalysis(null);
    setDuplicateCheck(null);
    setCoords(null);
    setLocationStatus(null);
    handleRemoveVideo();
    photos.forEach((p) => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    });
    setPhotos([]);
    setForm({
      title: "",
      description: "",
      state: "",
      district: "",
      city: "",
      specificLocation: "",
      category: "",
    });
    setError("");
  };

  // State-dependent district options
  const districtOptions = (form.state ? INDIAN_STATES_AND_DISTRICTS[form.state] || [] : []).map(
    (d) => ({ value: d, label: d })
  );

  const categoryOptions = [
    { value: "Water & Sanitation", label: t("report.categories.water") },
    { value: "Agriculture", label: t("report.categories.agriculture") },
    { value: "Waste Management", label: t("report.categories.waste") },
    { value: "Healthcare", label: t("report.categories.healthcare") },
    { value: "Education", label: t("report.categories.education") },
    { value: "Environment", label: t("report.categories.environment") },
    { value: "Energy", label: t("report.categories.energy") },
    { value: "Transport & Mobility", label: t("report.categories.transport") },
    { value: "Other", label: t("report.categories.other") },
  ];

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Page Header */}
      <div>
        <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {t("report.pageTitle")}
        </h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" }}>
          {t("report.pageSubtitle")}
        </p>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* BEFORE SUBMISSION: Citizen-First Problem Report Form                 */}
      {/* -------------------------------------------------------------------- */}
      {!createdProblem ? (
        <Card>
          {error && (
            <div
              style={{
                padding: "0.85rem 1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-danger-subtle)",
                border: "1px solid var(--color-danger-border)",
                color: "var(--color-danger)",
                fontSize: "0.875rem",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Icon name="alert-triangle" size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {/* ============================================================== */}
            {/* SECTION A: Problem Details                                     */}
            {/* ============================================================== */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  paddingBottom: "0.75rem",
                  borderBottom: "1px solid var(--border-color)",
                  marginBottom: "1.25rem",
                }}
              >
                <Icon name="file-text" size={20} color="var(--color-primary)" />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  {t("report.problemDetails")}
                </h3>
              </div>

              {/* Problem Title */}
              <Input
                label={t("report.titleLabel")}
                name="title"
                placeholder={t("report.titlePlaceholder")}
                value={form.title}
                onChange={handleChange}
                required
                hint={t("report.titleHint")}
              />

              {/* Problem Description with Integrated Voice Input */}
              <div style={{ marginTop: "1rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.4rem",
                  }}
                >
                  <label
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {t("report.descLabel")} <span style={{ color: "var(--color-danger)" }}>*</span>
                  </label>

                  {/* Speech-to-Text Microphone Button */}
                  <div>
                    {isListening ? (
                      <button
                        type="button"
                        onClick={stopListening}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.45rem",
                          padding: "0.35rem 0.75rem",
                          backgroundColor: "#fee2e2",
                          border: "1px solid #fca5a5",
                          borderRadius: "var(--radius-full)",
                          color: "#b91c1c",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                        title={t("report.stopSpeakBtn")}
                        aria-label={t("report.stopSpeakBtn")}
                      >
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: "#ef4444",
                          }}
                        />
                        <span>{t("report.speaking")}</span>
                        <Icon name="x" size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startListening}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.45rem",
                          padding: "0.35rem 0.75rem",
                          backgroundColor: "var(--color-primary-subtle)",
                          border: "1px solid var(--color-primary-border)",
                          borderRadius: "var(--radius-full)",
                          color: "var(--color-primary)",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all var(--transition-fast)",
                        }}
                        title={`${t("report.speakBtn")} (${language === "hi" ? "हिन्दी" : "English"})`}
                        aria-label={t("report.speakBtn")}
                      >
                        <span>🎙</span>
                        <span>{t("report.speakBtn")}</span>
                        <span style={{ fontSize: "0.725rem", opacity: 0.85 }}>
                          ({language === "hi" ? "hi-IN" : "en-IN"})
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                <Textarea
                  name="description"
                  rows={5}
                  placeholder={t("report.descPlaceholder")}
                  value={form.description}
                  onChange={handleChange}
                  required
                  hint={t("report.descHint")}
                  style={{
                    borderColor: isListening ? "var(--color-danger)" : undefined,
                    boxShadow: isListening ? "0 0 0 2px #fee2e2" : undefined,
                  }}
                />

                {speechError && (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--color-danger)",
                      marginTop: "0.35rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <Icon name="alert-triangle" size={14} />
                    <span>{speechError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ============================================================== */}
            {/* SECTION B: Location                                            */}
            {/* ============================================================== */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  paddingBottom: "0.75rem",
                  borderBottom: "1px solid var(--border-color)",
                  marginBottom: "1.25rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Icon name="map-pin" size={20} color="var(--color-primary)" />
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {t("report.locationSectionTitle")}
                  </h3>
                </div>

                {/* "Use Current Location" Geolocation Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon="map-pin"
                  onClick={handleUseCurrentLocation}
                  loading={isLocating}
                >
                  {t("report.useCurrentLocationBtn")}
                </Button>
              </div>

              {/* Location detection status banner */}
              {locationStatus && (
                <div
                  style={{
                    padding: "0.6rem 0.85rem",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.825rem",
                    marginBottom: "1.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    backgroundColor:
                      locationStatus.type === "success"
                        ? "var(--color-success-subtle)"
                        : locationStatus.type === "error"
                        ? "var(--color-danger-subtle)"
                        : "var(--color-info-subtle)",
                    border: `1px solid ${
                      locationStatus.type === "success"
                        ? "var(--color-success-border)"
                        : locationStatus.type === "error"
                        ? "var(--color-danger-border)"
                        : "var(--color-info-border)"
                    }`,
                    color:
                      locationStatus.type === "success"
                        ? "var(--color-success)"
                        : locationStatus.type === "error"
                        ? "var(--color-danger)"
                        : "var(--color-info)",
                  }}
                >
                  <Icon
                    name={
                      locationStatus.type === "success"
                        ? "check-circle"
                        : locationStatus.type === "error"
                        ? "alert-triangle"
                        : "info"
                    }
                    size={16}
                  />
                  <span>{locationStatus.message}</span>
                </div>
              )}

              {/* State and District Cascading Dropdowns */}
              <div className="cs-grid-2">
                <Select
                  label={t("report.stateLabel")}
                  name="state"
                  value={form.state}
                  onChange={handleStateChange}
                  options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
                  placeholder={t("report.selectState")}
                  required
                />

                <Select
                  label={t("report.districtLabel")}
                  name="district"
                  value={form.district}
                  onChange={handleChange}
                  options={districtOptions}
                  placeholder={form.state ? t("report.selectDistrict") : t("report.selectStateFirst")}
                  disabled={!form.state}
                  required
                />
              </div>

              {/* City/Town/Block and Specific Location */}
              <div className="cs-grid-2" style={{ marginTop: "0.5rem" }}>
                <Input
                  label={t("report.cityLabel")}
                  name="city"
                  placeholder={t("report.cityPlaceholder")}
                  value={form.city}
                  onChange={handleChange}
                />

                <Input
                  label={t("report.specificLocationLabel")}
                  name="specificLocation"
                  placeholder={t("report.specificLocationPlaceholder")}
                  value={form.specificLocation}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* ============================================================== */}
            {/* SECTION C: Evidence (Separate Photo and Video Uploads)         */}
            {/* ============================================================== */}
            <div>
              <div
                style={{
                  paddingBottom: "0.75rem",
                  borderBottom: "1px solid var(--border-color)",
                  marginBottom: "1.25rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Icon name="camera" size={20} color="var(--color-primary)" />
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {t("report.evidenceSectionTitle")}
                  </h3>
                </div>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  {t("report.evidenceSectionSubtitle")}
                </p>
              </div>

              {evidenceError && (
                <div
                  style={{
                    padding: "0.6rem 0.85rem",
                    backgroundColor: "var(--color-danger-subtle)",
                    color: "var(--color-danger)",
                    fontSize: "0.825rem",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "1rem",
                    border: "1px solid var(--color-danger-border)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Icon name="alert-triangle" size={16} />
                  <span>{evidenceError}</span>
                </div>
              )}

              {/* Upload Buttons: PHOTO AND VIDEO MUST BE SEPARATE OPTIONS */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
                {/* Photo Upload Trigger */}
                <div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    style={{ display: "none" }}
                    id="photo-upload-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    icon="camera"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {t("report.uploadPhotoBtn")}
                  </Button>
                </div>

                {/* Video Upload Trigger */}
                <div>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept=".mp4,.webm,.mov,video/*"
                    onChange={handleVideoSelect}
                    style={{ display: "none" }}
                    id="video-upload-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    icon="video"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={!!video}
                  >
                    {t("report.uploadVideoBtn")}
                  </Button>
                </div>
              </div>

              {/* Photos Gallery Preview */}
              {photos.length > 0 && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "0.825rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                    {t("report.uploadPhotoBtn")} ({photos.length})
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                      gap: "1rem",
                    }}
                  >
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        style={{
                          border: "1px solid var(--border-color)",
                          borderRadius: "var(--radius-md)",
                          overflow: "hidden",
                          backgroundColor: "#ffffff",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <div
                          style={{
                            height: "120px",
                            backgroundColor: "#f8fafc",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                          }}
                        >
                          <img
                            src={photo.previewUrl}
                            alt={photo.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                        <div
                          style={{
                            padding: "0.5rem 0.65rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.75rem",
                          }}
                        >
                          <div style={{ overflow: "hidden" }}>
                            <div
                              style={{
                                fontWeight: 600,
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                color: "var(--text-primary)",
                              }}
                            >
                              {photo.name}
                            </div>
                            <div style={{ color: "var(--text-muted)" }}>
                              {formatFileSize(photo.size)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(photo.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--color-danger)",
                              cursor: "pointer",
                              padding: "0.2rem",
                              fontWeight: 700,
                            }}
                            title={t("report.removeFile")}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Video Player Preview */}
              {video && (
                <div
                  style={{
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    padding: "0.85rem",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.65rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.1rem" }}>🎥</span>
                      <div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                          {video.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {formatFileSize(video.size)} &bull; {video.type}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveVideo}
                      style={{ color: "var(--color-danger)" }}
                    >
                      ✕ {t("report.removeFile")}
                    </Button>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#000000",
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                      maxHeight: "280px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <video
                      src={video.previewUrl}
                      controls
                      style={{ maxWidth: "100%", maxHeight: "280px", borderRadius: "var(--radius-md)" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ============================================================== */}
            {/* SECTION D: Category (Optional)                                 */}
            {/* ============================================================== */}
            <div>
              <div
                style={{
                  paddingBottom: "0.75rem",
                  borderBottom: "1px solid var(--border-color)",
                  marginBottom: "1.25rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Icon name="tag" size={20} color="var(--color-primary)" />
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {t("report.categorySectionTitle")}
                  </h3>
                </div>
              </div>

              <Select
                label={t("report.categoryLabel")}
                name="category"
                value={form.category}
                onChange={handleChange}
                options={categoryOptions}
                placeholder={t("report.categoryPlaceholder")}
              />
            </div>

            {/* ============================================================== */}
            {/* SECTION E: Submit Button                                       */}
            {/* ============================================================== */}
            <div style={{ paddingTop: "0.5rem" }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                icon="check"
                style={{ width: "100%" }}
              >
                {loading ? t("report.submittingBtn") : t("report.submitBtn")}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        /* -------------------------------------------------------------------- */
        /* AFTER SUBMISSION: Post-Submission Receipt & AI Intelligence          */
        /* -------------------------------------------------------------------- */
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Post-Submission Receipt Card */}
          <Card>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Header with checkmark and Problem ID */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "1rem",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-success-subtle)",
                      color: "var(--color-success)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="check" size={24} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {t("report.receiptSuccessTitle")} ✓
                    </h2>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                      {t("report.analyzingSubtitle")}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "var(--bg-muted)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    textAlign: "right",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>
                    {t("report.problemIdLabel")}
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-primary)" }}>
                    PRB-{String(createdProblem.id).padStart(4, "0")}
                  </div>
                </div>
              </div>

              {/* Status Verification Checklist */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  backgroundColor: "var(--bg-muted)",
                  padding: "1.25rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--color-success)", fontSize: "0.9rem", fontWeight: 600 }}>
                  <Icon name="check-circle" size={18} />
                  <span>{t("report.stepReceived")}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--color-success)", fontSize: "0.9rem", fontWeight: 600 }}>
                  <Icon name="check-circle" size={18} />
                  <span>{t("report.stepProcessed")}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--color-success)", fontSize: "0.9rem", fontWeight: 600 }}>
                  <Icon name="check-circle" size={18} />
                  <span>{t("report.stepRelated")}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--color-success)", fontSize: "0.9rem", fontWeight: 600 }}>
                  <Icon name="check-circle" size={18} />
                  <span>{t("report.stepExpertise")}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--color-success)", fontSize: "0.9rem", fontWeight: 600 }}>
                  <Icon name="check-circle" size={18} />
                  <span>{t("report.stepPriority")}</span>
                </div>
              </div>

              {/* Post-Submission Action Buttons */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", paddingTop: "0.5rem" }}>
                <Button
                  variant="primary"
                  size="md"
                  icon="external-link"
                  onClick={() => navigate(`/problems/${createdProblem.id}`)}
                >
                  {t("report.viewProblemBtn")}
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  icon="plus-circle"
                  onClick={handleReset}
                >
                  {t("report.submitAnotherBtn")}
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  icon="search"
                  onClick={() => navigate("/explore")}
                >
                  {t("report.exploreProblemsBtn")}
                </Button>
              </div>
            </div>
          </Card>

          {/* AI Problem Analysis Card (Real AI Analysis from Backend) */}
          {aiAnalysis && (
            <>
              <Card
                title={t("report.aiAnalysisTitle")}
                subtitle={`Automated NLP intelligence for PRB-${String(createdProblem.id).padStart(4, "0")}`}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
                  {/* Domain & Subdomain */}
                  <div style={{ padding: "0.85rem", backgroundColor: "var(--bg-muted)", borderRadius: "var(--radius-md)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                      {t("report.domainLabel")} / {t("report.subdomainLabel")}
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>
                      {aiAnalysis.domain || createdProblem.category || "General Civic"}
                    </div>
                    {aiAnalysis.subdomain && (
                      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                        {aiAnalysis.subdomain}
                      </div>
                    )}
                  </div>

                  {/* Severity & Urgency */}
                  <div style={{ padding: "0.85rem", backgroundColor: "var(--bg-muted)", borderRadius: "var(--radius-md)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                      {t("report.severityLabel")} &bull; {t("report.urgencyLabel")}
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>
                      {aiAnalysis.severity || "MEDIUM"} &bull; {aiAnalysis.urgency || "MEDIUM"}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                      Confidence: {Math.round((aiAnalysis.confidence || 0.85) * 100)}%
                    </div>
                  </div>

                {/* Priority Score removed */}

                  {/* Related Problems */}
                  <div style={{ padding: "0.85rem", backgroundColor: "var(--bg-muted)", borderRadius: "var(--radius-md)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                      {t("report.relatedProblemsLabel")}
                    </div>
                    <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--color-secondary)", marginTop: "0.2rem" }}>
                      {duplicateCheck?.duplicates_found ?? 0}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      Potential matches evaluated
                    </div>
                  </div>
                </div>

                {/* Required Expertise Tags */}
                {Array.isArray(aiAnalysis.required_expertise) && aiAnalysis.required_expertise.length > 0 && (
                  <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: "0.825rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                      {t("report.requiredExpertiseLabel")}:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {aiAnalysis.required_expertise.map((exp, idx) => (
                        <span
                          key={idx}
                          style={{
                            display: "inline-block",
                            padding: "0.25rem 0.65rem",
                            backgroundColor: "var(--color-primary-subtle)",
                            border: "1px solid var(--color-primary-border)",
                            borderRadius: "var(--radius-full)",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: "var(--color-primary)",
                          }}
                        >
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
