import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  TextField,
  MenuItem,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  CircularProgress,
  Chip,
  IconButton
} from "@mui/material";
import { useAppStore } from "../store/useAppStore";
import ConfirmModal from "./ConfirmModal";
import ResultModal from "./ResultModal";
import CloseIcon from '@mui/icons-material/Close';

const steps = ["Setup Period", "Select Services", "Define Targets & Lock"];

const isDurationKpi = (k) => (k.category === "Timeliness" || k.category === "Efficiency") && k.unit !== "/ 5";

export default function CommitmentWizardModal({ open, onClose, commitmentId, readOnly }) {
  const {
    periods,
    services,
    kpis,
    commitments,
    activeCommitment,
    fetchPeriods,
    fetchServices,
    fetchKpis,
    fetchCommitments,
    fetchCommitmentById,
    createCommitmentDraft,
    updateCommitmentDraft,
    lockCommitment,
  } = useAppStore();

  const [activeStep, setActiveStep] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);
  const [kpiTargets, setKpiTargets] = useState({}); // { kpiId: value or duration object }
  const [targetErrors, setTargetErrors] = useState({});

  const [draftId, setDraftId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState("");
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [resultModal, setResultModal] = useState({ show: false, type: "success", title: "", message: "" });

  // Helper to convert minutes to days, hours, mins object
  const minsToDurationObj = (totalMins) => {
    const mins = Number(totalMins) || 0;
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    const m = Math.round(mins % 60);
    return {
      days: d || "",
      hours: h || "",
      mins: m || "",
      isDuration: true
    };
  };

  const loadTargets = (items) => {
    const targets = {};

    // First, populate all default values from KPI standards for any active KPIs
    kpis.forEach(k => {
      if (isDurationKpi(k)) {
        targets[k.id] = minsToDurationObj(k.target_value);
      } else {
        const parsed = parseFloat(k.target_value);
        targets[k.id] = isNaN(parsed) ? "0" : String(parsed);
      }
    });

    // Then overwrite with saved draft values
    items?.forEach(i => {
      if (i.target_value !== null && i.target_value !== undefined) {
        const kpi = kpis.find(k => k.id === i.kpi_id);
        const isDuration = kpi ? isDurationKpi(kpi) : false;
        if (isDuration) {
          targets[i.kpi_id] = minsToDurationObj(i.target_value);
        } else {
          const parsed = parseFloat(i.target_value);
          targets[i.kpi_id] = isNaN(parsed) ? "0" : String(parsed);
        }
      }
    });

    return targets;
  };

  // Initialize data
  useEffect(() => {
    if (open) {
      setLoading(true);
      const promises = [
        fetchPeriods(),
        fetchServices(),
        fetchKpis(),
        fetchCommitments()
      ];
      if (commitmentId) {
        promises.push(fetchCommitmentById(commitmentId));
      }
      Promise.all(promises)
        .then(() => setLoading(false))
        .catch(err => {
          console.error("Failed to load commitment wizard data:", err);
          setLoading(false);
          setResultModal({
            show: true,
            type: "error",
            title: "Error Loading Data",
            message: err.message || "Could not load data. Please check your permissions or try again."
          });
        });
    }
  }, [open, commitmentId]);

  // Load draft or selected commitment if it exists — only once on initial open
  const hasLoadedDraft = React.useRef(false);
  useEffect(() => {
    if (!open) {
      hasLoadedDraft.current = false; // Reset when modal closes
      return;
    }
    if (hasLoadedDraft.current || loading) return;

    if (commitmentId) {
      if (activeCommitment && String(activeCommitment.id) === String(commitmentId)) {
        hasLoadedDraft.current = true;
        setDraftId(activeCommitment.id);
        setSelectedPeriod(activeCommitment.period_id);
        const sIds = [...new Set(activeCommitment.items?.map(i => i.service_id) || [])];
        setSelectedServices(sIds);

        const targets = loadTargets(activeCommitment.items);
        setKpiTargets(targets);
      }
    } else if (commitments.length > 0 || periods.length > 0) {
      hasLoadedDraft.current = true;
      const activePeriod = periods.find(p => p.status === "Active" || p.status === "Open");
      const draft = commitments.find(c => c.status === "Draft" && (!activePeriod || String(c.period_id) === String(activePeriod.id)));
      if (draft) {
        setDraftId(draft.id);
        setSelectedPeriod(draft.period_id);
        const sIds = [...new Set(draft.items?.map(i => i.service_id) || [])];
        setSelectedServices(sIds);

        const targets = loadTargets(draft.items);
        setKpiTargets(targets);
      } else {
        // Auto-select active period if no draft
        const activePeriod = periods.find(p => p.status === "Active" || p.status === "Open");
        if (activePeriod) {
          setSelectedPeriod(activePeriod.id);
        }
        const targets = loadTargets([]);
        setKpiTargets(targets);
      }
    }
  }, [open, loading, commitmentId, activeCommitment, commitments, periods, kpis]);

  // Sync / initialize targets for any newly selected services
  useEffect(() => {
    if (!hasLoadedDraft.current) return;
    if (open && kpis.length > 0 && selectedServices.length > 0) {
      setKpiTargets(prev => {
        const updated = { ...prev };
        let changed = false;
        selectedServices.forEach(sId => {
          const serviceKpis = kpis.filter(k => String(k.service_id) === String(sId) && k.active);
          serviceKpis.forEach(k => {
            if (updated[k.id] === undefined) {
              changed = true;
              if (isDurationKpi(k)) {
                updated[k.id] = minsToDurationObj(k.target_value);
              } else {
                updated[k.id] = String(k.target_value || 0);
              }
            }
          });
        });
        return changed ? updated : prev;
      });
    }
  }, [selectedServices, kpis, open]);

  const saveDraftSilent = async () => {
    if (!selectedPeriod) return;

    // Build items array based on selected services and their kpis
    const items = [];
    selectedServices.forEach(sId => {
      const serviceKpis = kpis.filter(k => String(k.service_id) === String(sId) && k.active);
      serviceKpis.forEach(k => {
        let finalVal = 0;
        const targetObj = kpiTargets[k.id];

        if (isDurationKpi(k)) {
          const d = Number(targetObj?.days) || 0;
          const h = Number(targetObj?.hours) || 0;
          const m = Number(targetObj?.mins) || 0;
          finalVal = d * 1440 + h * 60 + m;
        } else {
          finalVal = Number(targetObj) || 0;
        }

        items.push({
          service_id: sId,
          kpi_id: k.id,
          target_value: finalVal,
          unit: k.unit === "%" ? "PERCENT" : (k.unit === " Days" ? "DAYS" : "COUNT")
        });
      });
    });

    if (draftId) {
      await updateCommitmentDraft(draftId, { items });
    } else {
      const newDraft = await createCommitmentDraft({
        period_id: selectedPeriod,
        items
      });
      setDraftId(newDraft.id);
    }
  };

  const saveDraft = async () => {
    if (!selectedPeriod) return;

    setAutoSaveStatus("Saving Draft...");
    try {
      await saveDraftSilent();
      setAutoSaveStatus("Draft Saved");
      setTimeout(() => setAutoSaveStatus(""), 3000);
      onClose(true); // Close the wizard modal and notify parent it was saved
    } catch (err) {
      console.error("Save draft failed", err);
      setAutoSaveStatus("Save Failed");
      setResultModal({
        show: true,
        type: "error",
        title: "Failed to Save Draft",
        message: err.message || "Something went wrong while saving your draft."
      });
    }
  };

  // Keep saveDraftSilent updated in a ref to avoid stale closure in setInterval
  const saveDraftRef = React.useRef(saveDraftSilent);
  useEffect(() => {
    saveDraftRef.current = saveDraftSilent;
  });

  useEffect(() => {
    const selectedPeriodObj = periods.find(p => String(p.id) === String(selectedPeriod));
    const isPeriodClosed = selectedPeriodObj ? (selectedPeriodObj.status === "Closed" || selectedPeriodObj.status === "Completed") : false;
    if (!open || readOnly || isPeriodClosed || !selectedPeriod) return;

    const interval = setInterval(async () => {
      setAutoSaveStatus("Auto-saving...");
      try {
        await saveDraftRef.current();
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
        setAutoSaveStatus(`Auto-saved at ${timeStr}`);
      } catch (err) {
        console.error("Auto-save failed:", err);
        setAutoSaveStatus("Save Failed");
      }
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [open, readOnly, selectedPeriod, periods]);

  const handlePeriodChange = (periodId) => {
    setSelectedPeriod(periodId);

    // Check if there is an existing draft commitment for this period
    const existing = commitments.find(c => String(c.period_id) === String(periodId));
    if (existing) {
      if (existing.status === 'Draft') {
        // Load the existing draft!
        setDraftId(existing.id);
        const sIds = [...new Set(existing.items?.map(i => i.service_id) || [])];
        setSelectedServices(sIds);
        const targets = loadTargets(existing.items);
        setKpiTargets(targets);
      } else {
        // If it's Locked, reset draftId and services/targets (will be blocked from proceeding anyway)
        setDraftId(null);
        setSelectedServices([]);
        setKpiTargets(loadTargets([]));
      }
    } else {
      // If no commitment exists, reset draftId and services/targets to default kpi targets
      setDraftId(null);
      setSelectedServices([]);
      setKpiTargets(loadTargets([]));
    }
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleToggleService = (serviceId) => {
    setSelectedServices(prev =>
      prev.some(id => String(id) === String(serviceId))
        ? prev.filter(id => String(id) !== String(serviceId))
        : [...prev, serviceId]
    );
  };

  const handleDurationChange = (kpiId, field, value) => {
    setKpiTargets(prev => {
      const current = prev[kpiId] || { days: "", hours: "", mins: "", isDuration: true };
      return {
        ...prev,
        [kpiId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  const handleValueChange = (kpiId, value) => {
    setKpiTargets(prev => ({
      ...prev,
      [kpiId]: value
    }));
  };

  // Validations
  const validateSingleTarget = (kpi, targetObj) => {
    if (isDurationKpi(kpi)) {
      const dStr = targetObj?.days?.toString().trim() || "";
      const hStr = targetObj?.hours?.toString().trim() || "";
      const mStr = targetObj?.mins?.toString().trim() || "";

      if (!dStr && !hStr && !mStr) {
        return "Duration is required.";
      }

      const d = Number(targetObj?.days) || 0;
      const h = Number(targetObj?.hours) || 0;
      const m = Number(targetObj?.mins) || 0;

      if (d < 0 || h < 0 || m < 0) {
        return "Negative values not allowed.";
      }
      if (h > 23) {
        return "Hours must be 0-23.";
      }
      if (m > 59) {
        return "Minutes must be 0-59.";
      }
      const total = d * 1440 + h * 60 + m;
      if (total === 0) {
        return "Must be greater than 0m.";
      }
    } else {
      const valStr = targetObj?.toString().trim() || "";
      if (!valStr) {
        return "Value is required.";
      }
      const val = Number(targetObj);
      if (isNaN(val)) {
        return "Must be a number.";
      }
      if (val <= 0) {
        return "Must be greater than 0.";
      }
      if (kpi.category === "Quality" && (val < 0 || val > 100)) {
        return "Must be 0-100%.";
      }
    }
    return null;
  };

  const validateAll = () => {
    const errs = {};
    selectedServices.forEach(sId => {
      const serviceKpis = kpis.filter(k => String(k.service_id) === String(sId) && k.active);
      serviceKpis.forEach(k => {
        const errorMsg = validateSingleTarget(k, kpiTargets[k.id]);
        if (errorMsg) {
          errs[k.id] = errorMsg;
        }
      });
    });
    setTargetErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLockSubmitClick = () => {
    const isValid = validateAll();
    if (!isValid) {
      alert("Please resolve target validation errors before locking.");
      return;
    }
    setShowLockConfirm(true);
  };

  const handleLock = async () => {
    try {
      await saveDraftSilent();
      await lockCommitment(draftId);
      setShowLockConfirm(false);
      onClose('locked');
    } catch (err) {
      setShowLockConfirm(false);
      setResultModal({
        show: true,
        type: "error",
        title: "Failed to Lock & Submit",
        message: err.message || "Something went wrong while locking your commitment."
      });
    }
  };

  if (loading) {
    return (
      <Dialog open={open} maxWidth="md" fullWidth>
        <DialogContent sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </DialogContent>
      </Dialog>
    );
  }

  const selectedPeriodObj = periods.find(p => String(p.id) === String(selectedPeriod));
  const isPeriodClosed = selectedPeriodObj ? (selectedPeriodObj.status === "Closed" || selectedPeriodObj.status === "Completed") : false;
  const isReadOnly = readOnly || isPeriodClosed;

  // Block Step 1 → 2 navigation when a LOCKED commitment already exists for the chosen period
  // (but allow editing that exact locked commitment if it's opened by commitmentId)
  const lockedForSelectedPeriod = selectedPeriod
    ? commitments.find(
      c =>
        String(c.period_id) === String(selectedPeriod) &&
        c.status === 'Locked' &&
        String(c.id) !== String(commitmentId)
    )
    : null;
  const isBlockedByLockedCommitment = !!lockedForSelectedPeriod && !commitmentId;
  const displayPeriods = periods.filter(p => p.status === "Active" || p.status === "Open" || p.id === selectedPeriod);
  const availableServices = services.filter(s => {
    if (selectedServices.some(id => String(id) === String(s.id))) return true; // Always show selected services
    if (!s.active) return false;
    // Check if flagged N/A for the currently selected period
    if (selectedPeriod && Array.isArray(s.naFlags) && s.naFlags.some(f => String(f.period_id) === String(selectedPeriod))) {
      return false;
    }
    return true;
  });

  return (
    <>
      <Dialog
        open={open}
        onClose={(e, reason) => {
          if (reason !== "backdropClick") {
            onClose(e, reason);
          }
        }}
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            maxWidth: '750px',
            borderRadius: 3,
            minHeight: '600px'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 500, fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pr: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            OPCR Commitment Wizard
            {autoSaveStatus && (
              <Typography variant="caption" sx={{ color: autoSaveStatus === 'Save Failed' ? 'error.main' : 'text.secondary', fontWeight: 'normal' }}>
                ({autoSaveStatus})
              </Typography>
            )}
          </Box>
          {activeStep > 0 && (
            <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>

        <Box sx={{ width: '100%', p: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <DialogContent sx={{ bgcolor: '#F8FAFC', p: 3 }}>
          {activeStep === 0 && (
            <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#1E293B', fontWeight: 600 }}>Select Evaluation Period</Typography>
              <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                You can only create commitments for an currently Active evaluation period.
              </Typography>

              <TextField
                select
                fullWidth
                label="Evaluation Period"
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(e.target.value)}
                disabled={activeStep > 0 || !!commitmentId || isReadOnly}
              >
                {displayPeriods.length === 0 && (
                  <MenuItem disabled value="">No active periods available</MenuItem>
                )}
                {displayPeriods.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </TextField>
              {draftId && (activeStep > 0 || !!commitmentId) && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Continuing from an existing draft. Period selection is locked.
                </Typography>
              )}
              {draftId && activeStep === 0 && !commitmentId && (
                <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1, fontWeight: 600 }}>
                  Note: An existing draft was found for this period and has been loaded.
                </Typography>
              )}

              {/* Blocking alert when a locked commitment already exists for this period */}
              {isBlockedByLockedCommitment && (
                <Box
                  sx={{
                    mt: 3,
                    p: '16px 20px',
                    borderRadius: '10px',
                    border: '1px solid rgba(220, 38, 38, 0.25)',
                    bgcolor: '#FEF2F2',
                    display: 'flex',
                    gap: 2,
                    alignItems: 'flex-start',
                  }}
                >
                  <Box sx={{ fontSize: 20, lineHeight: 1, flexShrink: 0, mt: '1px' }}>🔒</Box>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#DC2626', mb: 0.5 }}>
                      Commitment Already Locked
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#7F1D1D', lineHeight: 1.5 }}>
                      A locked commitment already exists for <strong>{selectedPeriodObj?.name}</strong>. Only one
                      commitment is allowed per office per evaluation period. You cannot open a new commitment
                      form for this period.
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#B91C1C', fontWeight: 600, display: 'block', mt: 1 }}>
                      To view the existing commitment, close this dialog and click "View" in the table.
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {activeStep === 1 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 1, color: '#1E293B', fontWeight: 600 }}>Select Services</Typography>
              <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                Select the services your office will commit to for this period. Services flagged as N/A are hidden.
              </Typography>

              <Box sx={{ maxHeight: 350, overflow: 'auto', pr: 0.5 }}>
                {availableServices.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: 'center', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
                    <Typography color="text.secondary" variant="body2">No active applicable services found.</Typography>
                  </Paper>
                ) : (
                  availableServices.map((svc) => {
                    const isSelected = selectedServices.some(id => String(id) === String(svc.id));
                    const labelId = `checkbox-list-label-${svc.id}`;

                    const serviceKpis = kpis.filter(k => String(k.service_id) === String(svc.id) && k.active);
                    const hasActiveKpis = serviceKpis.length > 0;

                    // Normalize classification styles
                    const cls = svc.classification || "Simple";
                    let chipStyle = { color: "#10B981", bg: "#ECFDF5", border: "1px solid rgba(16, 185, 129, 0.15)" }; // Simple default
                    if (cls.toLowerCase().includes("technical")) {
                      chipStyle = { color: "#EF4444", bg: "#FEF2F2", border: "1px solid rgba(239, 68, 68, 0.15)" };
                    } else if (cls.toLowerCase().includes("complex")) {
                      chipStyle = { color: "#D97706", bg: "#FFFBEB", border: "1px solid rgba(217, 119, 6, 0.15)" };
                    }

                    return (
                      <Box
                        key={svc.id}
                        onClick={() => !isReadOnly && hasActiveKpis && handleToggleService(svc.id)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          p: "14px 20px",
                          mb: 1.5,
                          borderRadius: "10px",
                          border: "1px solid",
                          borderColor: isSelected ? "#800000" : "#E2E8F0",
                          bgcolor: isSelected ? "#FFF5F5" : "#ffffff",
                          cursor: (isReadOnly || !hasActiveKpis) ? "not-allowed" : "pointer",
                          opacity: hasActiveKpis ? 1 : 0.6,
                          transition: "all 0.2s ease-in-out",
                          ...(!hasActiveKpis ? {} : {
                            "&:hover": {
                              borderColor: isSelected ? "#800000" : "#CBD5E1",
                              bgcolor: isSelected ? "#FFF5F5" : "#F8FAFC",
                            }
                          })
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Checkbox
                            checked={isSelected}
                            disabled={isReadOnly || !hasActiveKpis}
                            tabIndex={-1}
                            disableRipple
                            sx={{
                              color: "#CBD5E1",
                              p: 0,
                              "&.Mui-checked": {
                                color: "#800000",
                              },
                            }}
                          />
                          <Box>
                            <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", color: "#1E293B", lineHeight: 1.25, mb: 0.25 }}>
                              {svc.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
                              {svc.responsibleUnit || svc.responsible_unit || "—"}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                          {!hasActiveKpis && (
                            <Chip
                              label="⚠️ No KPIs Defined"
                              size="small"
                              sx={{
                                color: "#DC2626",
                                bgcolor: "#FEF2F2",
                                border: "1px solid rgba(239, 68, 68, 0.2)",
                                fontWeight: 700,
                                fontSize: "10px",
                                px: 0.5,
                              }}
                            />
                          )}

                          <Chip
                            label={svc.classification}
                            size="small"
                            sx={{
                              color: chipStyle.color,
                              bgcolor: chipStyle.bg,
                              border: chipStyle.border,
                              fontWeight: 700,
                              fontSize: "11px",
                              px: 1
                            }}
                          />
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            </Box>
          )}

          {activeStep === 2 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 1, color: '#1E293B', fontWeight: 600 }}>Define Targets</Typography>
              <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                Set the target values for each KPI. All targets must be greater than 0 before locking. Drafts are auto-saved.
              </Typography>

              {selectedServices.length === 0 ? (
                <Typography color="error">No services selected. Go back to Step 2.</Typography>
              ) : (
                <Box sx={{ maxHeight: 380, overflow: 'auto' }}>
                  {selectedServices.map(sId => {
                    const svc = services.find(s => String(s.id) === String(sId));
                    const serviceKpis = kpis.filter(k => String(k.service_id) === String(sId) && k.active);

                    if (serviceKpis.length === 0) return null;

                    return (
                      <Paper key={sId} sx={{ p: 3, mb: 3, border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: 'none' }}>
                        <Typography sx={{ fontWeight: 700, color: '#0F172A', fontSize: '1.05rem', mb: 2.5, borderBottom: '1px solid #F1F5F9', pb: 1.5 }}>
                          {svc?.name}
                        </Typography>
                        {serviceKpis.map((kpi, idx) => {
                          const isDuration = isDurationKpi(kpi);
                          return (
                            <Box
                              key={kpi.id}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                py: 2,
                                borderBottom: idx === serviceKpis.length - 1 ? 'none' : '1px solid #F8FAFC',
                                justifyContent: 'space-between',
                                gap: 3
                              }}
                            >
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>{kpi.name}</Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                  <span style={{ fontWeight: 600 }}>{kpi.category}</span>
                                  <span>•</span>
                                  <span>Target Unit: {kpi.unit}</span>
                                </Typography>
                              </Box>

                              {isDuration ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.725rem' }}>Days</Typography>
                                      <TextField
                                        size="small"
                                        type="number"
                                        placeholder="0"
                                        value={kpiTargets[kpi.id]?.days ?? ""}
                                        onChange={(e) => {
                                          handleDurationChange(kpi.id, "days", e.target.value);
                                          setTargetErrors(prev => ({ ...prev, [kpi.id]: "" }));
                                        }}
                                        disabled={isReadOnly}
                                        error={!!targetErrors[kpi.id]}
                                        sx={{
                                          width: 75,
                                          '& .MuiOutlinedInput-root': {
                                            bgcolor: '#F8FAFC',
                                            borderRadius: '8px',
                                            '& fieldset': { borderColor: '#E2E8F0' },
                                            '&:hover fieldset': { borderColor: '#CBD5E1' },
                                            '&.Mui-focused fieldset': { borderColor: '#800000' }
                                          }
                                        }}
                                        inputProps={{ style: { textAlign: 'center', fontWeight: 700, color: '#1E293B' } }}
                                      />
                                    </Box>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.725rem' }}>Hours</Typography>
                                      <TextField
                                        size="small"
                                        type="number"
                                        placeholder="0"
                                        value={kpiTargets[kpi.id]?.hours ?? ""}
                                        onChange={(e) => {
                                          handleDurationChange(kpi.id, "hours", e.target.value);
                                          setTargetErrors(prev => ({ ...prev, [kpi.id]: "" }));
                                        }}
                                        disabled={isReadOnly}
                                        error={!!targetErrors[kpi.id]}
                                        sx={{
                                          width: 75,
                                          '& .MuiOutlinedInput-root': {
                                            bgcolor: '#F8FAFC',
                                            borderRadius: '8px',
                                            '& fieldset': { borderColor: '#E2E8F0' },
                                            '&:hover fieldset': { borderColor: '#CBD5E1' },
                                            '&.Mui-focused fieldset': { borderColor: '#800000' }
                                          }
                                        }}
                                        inputProps={{ style: { textAlign: 'center', fontWeight: 700, color: '#1E293B' } }}
                                      />
                                    </Box>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.725rem' }}>Mins</Typography>
                                      <TextField
                                        size="small"
                                        type="number"
                                        placeholder="0"
                                        value={kpiTargets[kpi.id]?.mins ?? ""}
                                        onChange={(e) => {
                                          handleDurationChange(kpi.id, "mins", e.target.value);
                                          setTargetErrors(prev => ({ ...prev, [kpi.id]: "" }));
                                        }}
                                        disabled={isReadOnly}
                                        error={!!targetErrors[kpi.id]}
                                        sx={{
                                          width: 75,
                                          '& .MuiOutlinedInput-root': {
                                            bgcolor: '#F8FAFC',
                                            borderRadius: '8px',
                                            '& fieldset': { borderColor: '#E2E8F0' },
                                            '&:hover fieldset': { borderColor: '#CBD5E1' },
                                            '&.Mui-focused fieldset': { borderColor: '#800000' }
                                          }
                                        }}
                                        inputProps={{ style: { textAlign: 'center', fontWeight: 700, color: '#1E293B' } }}
                                      />
                                    </Box>
                                  </Box>
                                  {targetErrors[kpi.id] && (
                                    <Typography variant="caption" color="error" sx={{ fontWeight: 500, alignSelf: 'flex-end', mt: 0.5 }}>
                                      {targetErrors[kpi.id]}
                                    </Typography>
                                  )}
                                </Box>
                              ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.725rem' }}>
                                      {kpi.unit === "%" || kpi.category === "Quality" ? "Value (%)" : "Value"}
                                    </Typography>
                                    <TextField
                                      size="small"
                                      type="number"
                                      placeholder="0"
                                      value={kpiTargets[kpi.id] ?? ""}
                                      onChange={(e) => {
                                        handleValueChange(kpi.id, e.target.value);
                                        setTargetErrors(prev => ({ ...prev, [kpi.id]: "" }));
                                      }}
                                      disabled={isReadOnly}
                                      error={!!targetErrors[kpi.id]}
                                      sx={{
                                        width: 140,
                                        '& .MuiOutlinedInput-root': {
                                          bgcolor: '#F8FAFC',
                                          borderRadius: '8px',
                                          '& fieldset': { borderColor: '#E2E8F0' },
                                          '&:hover fieldset': { borderColor: '#CBD5E1' },
                                          '&.Mui-focused fieldset': { borderColor: '#800000' }
                                        }
                                      }}
                                      inputProps={{ style: { textAlign: 'center', fontWeight: 700, color: '#1E293B' } }}
                                    />
                                  </Box>
                                  {targetErrors[kpi.id] && (
                                    <Typography variant="caption" color="error" sx={{ fontWeight: 500, alignSelf: 'flex-end', mt: 0.5 }}>
                                      {targetErrors[kpi.id]}
                                    </Typography>
                                  )}
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: '1px solid #E2E8F0', gap: 1 }}>
          <Box sx={{ flexGrow: 1 }} />

          {activeStep > 0 && (
            <Button
              variant="outlined"
              onClick={saveDraft}
              disabled={isReadOnly}
              sx={{
                color: '#15803D',
                borderColor: '#15803D',
                '&:hover': {
                  bgcolor: 'rgba(21, 128, 61, 0.04)',
                  borderColor: '#166534',
                  color: '#166534'
                },
                fontWeight: 600
              }}
            >
              Save as Draft
            </Button>
          )}

          {activeStep === 0 ? (
            <Button
              onClick={onClose}
              variant="outlined"
              sx={{ color: 'text.secondary', borderColor: '#CBD5E1', '&:hover': { bgcolor: '#F8FAFC', borderColor: '#94A3B8' } }}
            >
              Close
            </Button>
          ) : (
            <Button
              onClick={handleBack}
              variant="outlined"
            >
              Back
            </Button>
          )}

          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={activeStep === 0 && (!selectedPeriod || isBlockedByLockedCommitment)}
              sx={{ bgcolor: '#800000', '&:hover': { bgcolor: '#990000' } }}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              onClick={handleLockSubmitClick}
              disabled={selectedServices.length === 0 || isReadOnly}
            >
              Lock & Submit
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {showLockConfirm && (
        <ConfirmModal
          open={showLockConfirm}
          title="Lock Commitment?"
          body="Are you sure you want to lock and submit this commitment? Once locked, it cannot be edited, and it will serve as the official basis for the evaluation period."
          confirmLabel="Yes, Lock & Submit"
          onConfirm={handleLock}
          onCancel={() => setShowLockConfirm(false)}
        />
      )}

      {resultModal.show && (
        <ResultModal
          type={resultModal.type}
          title={resultModal.title}
          message={resultModal.message}
          onClose={() => setResultModal(prev => ({ ...prev, show: false }))}
        />
      )}
    </>
  );
}
