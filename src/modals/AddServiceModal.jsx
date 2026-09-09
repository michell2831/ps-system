import { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Typography,
  Box,
  Alert,
  MenuItem,
  IconButton,
  Tooltip,
  Paper,
  Select,
  Checkbox,
  ListItemText,
  Chip,
  OutlinedInput,
  InputLabel,
  FormHelperText
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DeleteOutlineIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

export default function AddServiceModal({ onClose, onAdd, onEdit, onNext, service }) {
  const isEditing = service ? !service.isNew : false;

  // Helper to parse SLA Target to extract both days and minutes
  const parseSla = (field) => {
    if (!service || !service[field]) return { days: "", hours: "", minutes: "" };
    const val = service[field];
    const matchDays = val.match(/(\d+)\s*d/i) || val.match(/(\d+)\s*Day/i);
    const matchHours = val.match(/(\d+)\s*h/i) || val.match(/(\d+)\s*Hour/i);
    const matchMins = val.match(/(\d+)\s*m/i) || val.match(/(\d+)\s*Min/i) || val.match(/(\d+)\s*Minute/i);
    return {
      days: matchDays ? matchDays[1] : "",
      hours: matchHours ? matchHours[1] : "",
      minutes: matchMins ? matchMins[1] : ""
    };
  };

  const initialSla = parseSla("slaTarget");

  const [serviceName, setServiceName] = useState(service ? service.name : "");
  const [slaDays, setSlaDays] = useState(initialSla.days);
  const [slaHours, setSlaHours] = useState(initialSla.hours);
  const [slaMinutes, setSlaMinutes] = useState(initialSla.minutes);
  const { activeUser } = useAppStore();

  const getOfficeDisplayName = (officeCode) => {
    switch (officeCode) {
      case 'ACAD':
        return "Academic Affairs";
      case 'OSAS':
        return "OSAS";
      case 'ADMIN':
        return "Administration";
      default:
        return officeCode || "";
    }
  };

  const [responsibleUnit, setResponsibleUnit] = useState(() => {
    if (service && service.responsibleUnit) {
      return service.responsibleUnit;
    }
    return activeUser ? getOfficeDisplayName(activeUser.office) : "";
  });

  useEffect(() => {
    if (!service || service.isNew) {
      if (activeUser) {
        setResponsibleUnit(getOfficeDisplayName(activeUser.office));
      }
    }
  }, [activeUser, service]);

  const parseInitialSteps = (serviceObj) => {
    if (!serviceObj) return [""];
    if (Array.isArray(serviceObj.processing_steps) && serviceObj.processing_steps.length > 0) {
      return serviceObj.processing_steps.map(s => String(s));
    }
    if (Array.isArray(serviceObj.stepsTimeline) && serviceObj.stepsTimeline.length > 0) {
      return serviceObj.stepsTimeline.map(s => String(s));
    }
    if (typeof serviceObj.stepsTimeline === 'string' && serviceObj.stepsTimeline.trim()) {
      const parts = serviceObj.stepsTimeline.split('\n').map(s => s.trim()).filter(Boolean);
      if (parts.length > 0) return parts;
    }
    return [""];
  };

  const parseInitialModeIds = (serviceObj) => {
    if (!serviceObj) return [];
    if (Array.isArray(serviceObj.mode_ids) && serviceObj.mode_ids.length > 0) {
      return serviceObj.mode_ids;
    }
    if (Array.isArray(serviceObj.modes) && serviceObj.modes.length > 0) {
      return serviceObj.modes.map(m => typeof m === 'object' ? m.id : m).filter(Boolean);
    }
    return [];
  };

  const [availableModes, setAvailableModes] = useState([]);
  const [loadingModes, setLoadingModes] = useState(true);
  const [selectedModeIds, setSelectedModeIds] = useState(() => parseInitialModeIds(service));

  useEffect(() => {
    let isMounted = true;
    setLoadingModes(true);
    api.getServiceModes()
      .then(res => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : (res?.data || []);
        const activeModes = list.filter(m => m.is_active !== false);
        setAvailableModes(activeModes);

        if (service && (!selectedModeIds || selectedModeIds.length === 0)) {
          if (Array.isArray(service.modes) && service.modes.length > 0) {
            setSelectedModeIds(service.modes.map(m => typeof m === 'object' ? m.id : m).filter(Boolean));
          } else if (service.service_mode) {
            const match = activeModes.find(m => m.name.toLowerCase() === service.service_mode.toLowerCase());
            if (match) {
              setSelectedModeIds([match.id]);
            }
          }
        }
        setLoadingModes(false);
      })
      .catch(err => {
        console.error("Failed to load service modes:", err);
        if (isMounted) {
          setAvailableModes([]);
          setLoadingModes(false);
        }
      });
    return () => { isMounted = false; };
  }, [service]);

  const [intakeDocuments, setIntakeDocuments] = useState(service && service.intakeDocuments ? service.intakeDocuments : "");
  const [steps, setSteps] = useState(() => parseInitialSteps(service));
  const [stepErrors, setStepErrors] = useState({});
  const [expectedOutput, setExpectedOutput] = useState(service && service.expectedOutput ? service.expectedOutput : "");
  const [classification, setClassification] = useState(service ? (service.classification || "") : "");
  const [active, setActive] = useState(service ? service.active : true);
  
  const [showSlaWarning, setShowSlaWarning] = useState(false);
  const [pendingServiceData, setPendingServiceData] = useState(null);

  const handleStepChange = (index, value) => {
    const next = [...steps];
    next[index] = value;
    setSteps(next);
    if (stepErrors[index]) {
      setStepErrors(prev => {
        const copy = { ...prev };
        delete copy[index];
        return copy;
      });
    }
    clearError("steps");
  };

  const addStep = () => {
    setSteps(prev => [...prev, ""]);
    clearError("steps");
  };

  const removeStep = (index) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
    setStepErrors(prev => {
      const newErrors = {};
      Object.keys(prev).forEach(key => {
        const k = Number(key);
        if (k < index) newErrors[k] = prev[k];
        else if (k > index) newErrors[k - 1] = prev[k];
      });
      return newErrors;
    });
    clearError("steps");
  };

  const moveStepUp = (index) => {
    if (index === 0) return;
    setSteps(prev => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
    setStepErrors(prev => {
      const newErrors = { ...prev };
      const errPrev = newErrors[index - 1];
      const errCurr = newErrors[index];
      if (errCurr) newErrors[index - 1] = errCurr; else delete newErrors[index - 1];
      if (errPrev) newErrors[index] = errPrev; else delete newErrors[index];
      return newErrors;
    });
  };

  const moveStepDown = (index) => {
    if (index === steps.length - 1) return;
    setSteps(prev => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
    setStepErrors(prev => {
      const newErrors = { ...prev };
      const errNext = newErrors[index + 1];
      const errCurr = newErrors[index];
      if (errCurr) newErrors[index + 1] = errCurr; else delete newErrors[index + 1];
      if (errNext) newErrors[index] = errNext; else delete newErrors[index];
      return newErrors;
    });
  };
  
  const [errors, setErrors] = useState({});
  const [offices, setOffices] = useState([]);

  useEffect(() => {
    let active = true;
    api.getOffices()
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (active) {
          const activeOffices = list.filter(o => o.isActive !== false).map(o => o.name);
          if (responsibleUnit && !activeOffices.includes(responsibleUnit)) {
            activeOffices.push(responsibleUnit);
          }
          setOffices(activeOffices);
        }
      })
      .catch(err => {
        console.error("Failed to load offices", err);
        if (active) {
          setOffices([
            "Quality Assurance",
            "Records Office",
            "Academic Affairs",
            "Laboratory Division",
            "Research Office",
            "Library Services",
            "Alumni Relations",
            "Registrar Office",
            "IT Department",
            "OSAS",
            "Medical Services",
            "Dental Services"
          ]);
        }
      });
    return () => { active = false; };
  }, [responsibleUnit]);

  const handleSave = async () => {
    const e = {};

    const countAlphanumeric = (str) => {
      if (!str) return 0;
      return (str.match(/[a-zA-Z0-9]/g) || []).length;
    };

    if (!serviceName || !serviceName.trim()) {
      e.serviceName = "Service name is required.";
    } else if (serviceName.trim().length < 3) {
      e.serviceName = "Service name must be at least 3 characters.";
    } else if (serviceName.length > 100) {
      e.serviceName = "Service name must not exceed 100 characters.";
    }

    const daysStr = slaDays ? String(slaDays).trim() : "";
    const hoursStr = slaHours ? String(slaHours).trim() : "";
    const minsStr = slaMinutes ? String(slaMinutes).trim() : "";

    if (!daysStr && !hoursStr && !minsStr) {
      e.slaDays = true;
      e.slaHours = true;
      e.slaMinutes = true;
    } else {
      if (daysStr) {
        const daysVal = Number(daysStr);
        if (!/^\d+$/.test(daysStr) || isNaN(daysVal) || daysVal < 0) {
          e.slaDays = "Days must be a non-negative whole number.";
        }
      }

      if (hoursStr) {
        const hoursVal = Number(hoursStr);
        if (!/^\d+$/.test(hoursStr) || isNaN(hoursVal) || hoursVal < 0 || hoursVal > 23) {
          e.slaHours = "Hours must be a whole number between 0 and 23.";
        }
      }

      if (minsStr) {
        const minsVal = Number(minsStr);
        if (!/^\d+$/.test(minsStr) || isNaN(minsVal) || minsVal < 0 || minsVal > 59) {
          e.slaMinutes = "Minutes must be a whole number between 0 and 59.";
        }
      }

      if (!daysStr) {
        if (!hoursStr && !minsStr) {
          e.slaMinutes = "If Working Day is empty, at least Hours or Minutes must be provided.";
        }
      }
    }

    if (!responsibleUnit || !responsibleUnit.trim()) {
      e.responsibleUnit = "Responsible Office/Unit is required.";
    } else if (countAlphanumeric(responsibleUnit) < 3) {
      e.responsibleUnit = "Must contain at least 3 alphanumeric characters.";
    }

    if (intakeDocuments && intakeDocuments.length > 500) {
      e.intakeDocuments = "Required documents list must not exceed 500 characters.";
    }

    // Validate Processing Steps (min 1 step, non-empty step text per row)
    const sErrors = {};
    if (!steps || steps.length === 0) {
      e.steps = "At least one processing step is required.";
    } else {
      steps.forEach((stepText, idx) => {
        const trimmed = stepText ? stepText.trim() : "";
        if (!trimmed) {
          sErrors[idx] = "Step description cannot be empty.";
        } else if (trimmed.length < 3) {
          sErrors[idx] = "Step description must be at least 3 characters.";
        } else if (trimmed.length > 300) {
          sErrors[idx] = "Step description must not exceed 300 characters.";
        }
      });
    }

    if (Object.keys(sErrors).length > 0) {
      setStepErrors(sErrors);
      e.steps = "Please fix the errors in processing steps.";
    }

    if (expectedOutput) {
      if (expectedOutput.length > 300) {
        e.expectedOutput = "Expected output must not exceed 300 characters.";
      } else if (expectedOutput.trim() !== "" && countAlphanumeric(expectedOutput) < 3) {
        e.expectedOutput = "Must contain at least 3 alphanumeric characters.";
      }
    }

    if (classification && classification.length > 150) {
      e.classification = "Service mode must not exceed 150 characters.";
    }

    if (!selectedModeIds || selectedModeIds.length === 0) {
      e.selectedModeIds = "At least one service mode must be selected.";
    }

    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    // Prepare processing steps payload
    const trimmedStepsArray = steps.map(s => s.trim()).filter(Boolean);
    const stepsTimelineStr = trimmedStepsArray.join("\n");

    // Prepare modes payload
    const selectedModesList = availableModes.filter(m => selectedModeIds.includes(m.id));
    const firstModeName = selectedModesList.length > 0 ? selectedModesList[0].name : null;

    // Determine target SLA string
    let slaTarget = "";
    const daysPart = slaDays.trim() ? `${slaDays}d` : "";
    const hoursPart = slaHours.trim() ? `${slaHours}h` : "";
    const minsPart = slaMinutes.trim() ? `${slaMinutes}m` : "";
    
    const timeParts = [daysPart, hoursPart, minsPart].filter(Boolean);
    slaTarget = timeParts.length > 0 ? timeParts.join(" ") : "—";

    // Handle classification: prioritize user input, store null if empty
    let finalClassification = classification && classification.trim() !== "" ? classification.trim() : null;

    // Format last updated date and time
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const yy = String(today.getFullYear()).slice(-2);
    const h = String(today.getHours()).padStart(2, '0');
    const m = String(today.getMinutes()).padStart(2, '0');
    const formattedDate = `${mm}/${dd}/${yy} ${h}:${m}`;

    const targetData = {
      ...service,
      name: serviceName,
      classification: finalClassification,
      service_mode: firstModeName,
      slaTarget,
      sla: slaTarget,
      responsibleUnit: responsibleUnit.trim() || "Registrar Office - Caloocan",
      active,
      withReferral: service?.withReferral,
      intakeDocuments,
      stepsTimeline: stepsTimelineStr,
      processing_steps: trimmedStepsArray,
      mode_ids: selectedModeIds,
      modes: selectedModesList,
      expectedOutput,
      lastUpdated: formattedDate,
    };

    // Intercept SLA target changes for warning confirmation
    if (isEditing && service.slaTarget !== slaTarget && !showSlaWarning) {
      setPendingServiceData(targetData);
      setShowSlaWarning(true);
      return;
    }

    if (isEditing) {
      if (onEdit) {
        try {
          await onEdit(pendingServiceData || targetData);
          onClose();
        } catch (err) {
          console.error("Save service failed:", err);
          // Keep the modal open and exit warning mode if it was active
          setShowSlaWarning(false);
        }
      } else {
        onClose();
      }
    } else {
      const newSvcData = {
        serviceName,
        classification: finalClassification,
        service_mode: firstModeName,
        slaTarget,
        responsibleUnit: responsibleUnit.trim() || "Registrar Office - Caloocan",
        active,
        withReferral: undefined,
        intakeDocuments,
        stepsTimeline: stepsTimelineStr,
        processing_steps: trimmedStepsArray,
        mode_ids: selectedModeIds,
        modes: selectedModesList,
        expectedOutput,
        lastUpdated: formattedDate,
      };
      // If onNext is provided, hand off to the next step (Intake Field Builder)
      if (onNext) {
        onNext(newSvcData);
      } else if (onAdd) {
        onAdd(newSvcData);
        onClose();
      }
    }
  };

  const clearError = (key) => {
    setErrors(prev => ({ ...prev, [key]: false }));
  };

  return (
    <Dialog
      open
      onClose={(e, reason) => {
        if (reason !== "backdropClick") {
          onClose(e, reason);
        }
      }}
      sx={{ '& .MuiDialog-paper': { maxWidth: '500px', width: '100%', borderRadius: 2.5 } }}
    >
      {showSlaWarning ? (
        <Box sx={{ p: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: "#FFFBEB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#D97706",
              flexShrink: 0,
              border: "1px solid rgba(217, 119, 6, 0.15)"
            }}>
              <WarningAmberRoundedIcon fontSize="medium" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary" }}>
              SLA Change Warning
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.65 }}>
            You are updating the SLA Target for <strong style={{ color: "#800000" }}>"{serviceName}"</strong>.
            <br /><br />
            Changing the SLA Target will officially create a historical version record in the <strong>service_versions</strong> database table to maintain an audit trail under Citizens' Charter guidelines.
          </Typography>

          <Box sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 2,
            p: 2,
            mb: 4
          }}>
            <div>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.disabled", textTransform: "uppercase", display: 'block', mb: 0.5 }}>
                Old SLA Target
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary" }}>
                {service?.slaTarget || service?.sla || "—"}
              </Typography>
            </div>
            <div>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.disabled", textTransform: "uppercase", display: 'block', mb: 0.5 }}>
                New SLA Target
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                {pendingServiceData?.slaTarget}
              </Typography>
            </div>
          </Box>

          <DialogActions sx={{ p: 0, gap: 1 }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => {
                setShowSlaWarning(false);
                setPendingServiceData(null);
              }}
            >
              Go Back &amp; Edit
            </Button>
            <Button
              variant="contained"
              sx={{
                bgcolor: '#15803D',
                '&:hover': { bgcolor: '#166534' }
              }}
              onClick={async () => {
                if (onEdit && pendingServiceData) {
                  try {
                    await onEdit(pendingServiceData);
                    onClose();
                  } catch (err) {
                    console.error("Save service failed after warning:", err);
                    setShowSlaWarning(false);
                  }
                } else {
                  onClose();
                }
              }}
            >
              Confirm &amp; Save SLA
            </Button>
          </DialogActions>
        </Box>
      ) : (
        <>
          <DialogTitle sx={{ fontWeight: 500, fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.35rem', pb: 1 }}>
            {isEditing ? "Edit Service Catalogue" : "Create New Service Catalogue"}
          </DialogTitle>

          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {/* Service Name */}
            <TextField
              label="Official Service Name"
              placeholder="e.g. Processing of Application for Graduation"
              required
              fullWidth
              value={serviceName}
              error={!!errors.serviceName}
              helperText={errors.serviceName}
              onChange={(e) => {
                setServiceName(e.target.value);
                clearError("serviceName");
              }}
              inputProps={{ maxLength: 300 }}
              variant="outlined"
              size="small"
              sx={{ mt: 1, '& .MuiFormLabel-asterisk': { color: '#ef4444' } }}
            />

            {/* Service Modes Multi-Select */}
            <FormControl fullWidth size="small" error={!!errors.selectedModeIds} required sx={{ mt: 1 }}>
              <InputLabel id="service-modes-label" sx={{ '& .MuiFormLabel-asterisk': { color: '#ef4444' } }}>
                Service Modes
              </InputLabel>
              <Select
                labelId="service-modes-label"
                id="service-modes-select"
                multiple
                value={selectedModeIds}
                onChange={(e) => {
                  const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                  setSelectedModeIds(val);
                  clearError("selectedModeIds");
                }}
                input={<OutlinedInput label="Service Modes *" />}
                renderValue={(selected) => {
                  if (!selected || selected.length === 0) {
                    return <Typography color="text.disabled" variant="body2">Select Service Modes</Typography>;
                  }
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((modeId) => {
                        const modeObj = availableModes.find(m => m.id === modeId);
                        const label = modeObj ? modeObj.name : modeId;
                        return (
                          <Chip
                            key={modeId}
                            label={label}
                            size="small"
                            sx={{
                              bgcolor: '#fdf2f2',
                              color: '#800000',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              border: '1px solid #fca5a5'
                            }}
                          />
                        );
                      })}
                    </Box>
                  );
                }}
                disabled={loadingModes || availableModes.length === 0}
              >
                {availableModes.length === 0 ? (
                  <MenuItem disabled value="">
                    <em>{loadingModes ? "Loading service modes..." : "No modes configured"}</em>
                  </MenuItem>
                ) : (
                  availableModes.map((mode) => (
                    <MenuItem key={mode.id} value={mode.id}>
                      <Checkbox checked={selectedModeIds.indexOf(mode.id) > -1} size="small" color="primary" />
                      <ListItemText primary={mode.name} secondary={mode.description || undefined} />
                    </MenuItem>
                  ))
                )}
              </Select>
              {errors.selectedModeIds && (
                <FormHelperText error sx={{ fontWeight: 600 }}>{errors.selectedModeIds}</FormHelperText>
              )}
            </FormControl>



            {/* SLA Inputs */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                SLA TARGETS <span style={{ color: '#ef4444' }}>*</span>
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5 }}>
                <TextField
                  label="Working Day (Days)"
                  placeholder="Days"
                  value={slaDays}
                  error={!!errors.slaDays}
                  helperText={typeof errors.slaDays === "string" ? errors.slaDays : ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setSlaDays(val);
                    clearError("slaDays");
                    clearError("slaMinutes");
                    clearError("slaHours");
                  }}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  label="Hours"
                  placeholder="Hours"
                  value={slaHours}
                  error={!!errors.slaHours}
                  helperText={errors.slaHours}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setSlaHours(val);
                    clearError("slaDays");
                    clearError("slaMinutes");
                    clearError("slaHours");
                  }}
                  variant="outlined"
                  size="small"
                />
                <TextField
                  label="Mins"
                  placeholder="Mins"
                  value={slaMinutes}
                  error={!!errors.slaMinutes}
                  helperText={typeof errors.slaMinutes === "string" ? errors.slaMinutes : ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setSlaMinutes(val);
                    clearError("slaDays");
                    clearError("slaMinutes");
                    clearError("slaHours");
                  }}
                  variant="outlined"
                  size="small"
                />
              </Box>
              {(errors.slaDays || errors.slaHours || errors.slaMinutes) && typeof errors.slaDays !== "string" && typeof errors.slaHours !== "string" && typeof errors.slaMinutes !== "string" && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block', fontWeight: 500 }}>
                  At least one SLA target (Days, Hours, or Minutes) must be provided.
                </Typography>
              )}
            </Box>

            {/* Responsible Office */}
            <TextField
              label="Responsible Office/Unit"
              required
              fullWidth
              InputProps={{
                readOnly: true,
              }}
              value={responsibleUnit}
              error={!!errors.responsibleUnit}
              helperText={errors.responsibleUnit}
              variant="outlined"
              size="small"
              sx={{ 
                '& .MuiFormLabel-asterisk': { color: '#ef4444' },
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#f8fafc',
                }
              }}
            />


            {/* Processing Steps (Dynamic Ordered List) */}
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block' }}>
                  PROCESSING STEPS <span style={{ color: '#ef4444' }}>*</span>
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  startIcon={<AddIcon fontSize="small" />}
                  onClick={addStep}
                  sx={{
                    color: '#580000',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    '&:hover': { bgcolor: 'rgba(88,0,0,0.06)' }
                  }}
                >
                  Add Step
                </Button>
              </Box>

              {steps.length === 0 ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    borderColor: errors.steps ? '#ef4444' : '#e2e8f0',
                    bgcolor: '#f8fafc',
                    borderRadius: 2
                  }}
                >
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.8125rem' }}>
                    No processing steps added yet.
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon fontSize="small" />}
                    onClick={addStep}
                    sx={{
                      borderColor: '#580000',
                      color: '#580000',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'none'
                    }}
                  >
                    Add First Step
                  </Button>
                </Paper>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  {steps.map((stepText, idx) => (
                    <Paper
                      key={idx}
                      variant="outlined"
                      sx={{
                        p: 1.25,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1,
                        borderRadius: 2,
                        borderColor: stepErrors[idx] ? '#ef4444' : '#e2e8f0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      {/* Step Number Badge */}
                      <Box
                        sx={{
                          minWidth: 26,
                          height: 26,
                          borderRadius: '50%',
                          bgcolor: '#580000',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          mt: '6px',
                          flexShrink: 0
                        }}
                      >
                        {idx + 1}
                      </Box>

                      {/* Step Description Input */}
                      <TextField
                        fullWidth
                        size="small"
                        placeholder={`Step ${idx + 1} description (e.g. Verify submitted documents)`}
                        value={stepText}
                        error={!!stepErrors[idx]}
                        helperText={stepErrors[idx]}
                        onChange={(e) => handleStepChange(idx, e.target.value)}
                        variant="outlined"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            fontSize: '0.85rem',
                            borderRadius: 1.5
                          }
                        }}
                      />

                      {/* Action Buttons: Move Up, Move Down, Delete */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mt: '2px', flexShrink: 0 }}>
                        <Tooltip title="Move Up">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => moveStepUp(idx)}
                              disabled={idx === 0}
                              sx={{ color: '#64748b', p: '4px' }}
                            >
                              <KeyboardArrowUpIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title="Move Down">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => moveStepDown(idx)}
                              disabled={idx === steps.length - 1}
                              sx={{ color: '#64748b', p: '4px' }}
                            >
                              <KeyboardArrowDownIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>

                        <Tooltip title="Delete Step">
                          <IconButton
                            size="small"
                            onClick={() => removeStep(idx)}
                            sx={{ color: '#ef4444', p: '4px', '&:hover': { bgcolor: '#fef2f2' } }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}

              {errors.steps && (
                <Typography variant="caption" color="error" sx={{ mt: 0.75, display: 'block', fontWeight: 600 }}>
                  {errors.steps}
                </Typography>
              )}
            </Box>

            {/* Expected Output */}
            <TextField
              label="Expected Output"
              placeholder="Official Document"
              fullWidth
              value={expectedOutput}
              error={!!errors.expectedOutput}
              helperText={errors.expectedOutput}
              onChange={(e) => {
                setExpectedOutput(e.target.value);
                clearError("expectedOutput");
              }}
              variant="outlined"
              size="small"
            />

            {/* Toggle Switch */}
            <Box sx={{ mt: 1 }}>
              <FormControlLabel
                control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} color="primary" />}
                label="ACTIVE"
                sx={{
                  '& .MuiFormControlLabel-label': {
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'text.secondary',
                    letterSpacing: '0.05em'
                  }
                }}
              />
            </Box>


          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
            <Button
              variant="outlined"
              color="inherit"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              sx={isEditing ? {
                bgcolor: '#15803D',
                '&:hover': { bgcolor: '#166534' }
              } : {
                bgcolor: '#800000',
                '&:hover': { bgcolor: '#990000' }
              }}
              onClick={handleSave}
            >
              {isEditing ? "Save Changes" : "Next"}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
