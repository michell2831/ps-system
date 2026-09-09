import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Typography,
  Box,
  Paper,
  IconButton,
  Tooltip,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import {
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  TextFields as TextFieldsIcon,
  Tag as TagIcon,
  CalendarMonth as CalendarMonthIcon,
  List as ListIcon,
  CheckBox as CheckBoxIcon
} from '@mui/icons-material';
import Toggle from "../components/Toggle";
import ResultModal from "./ResultModal";

const getFieldIconContainer = (type) => {
  let bgcolor = 'rgba(59, 130, 246, 0.08)';
  let border = '1px solid rgba(59, 130, 246, 0.15)';
  let icon = <TextFieldsIcon sx={{ fontSize: 18, color: '#3B82F6' }} />;

  if (type === "Number") {
    bgcolor = 'rgba(245, 158, 11, 0.08)';
    border = '1px solid rgba(245, 158, 11, 0.15)';
    icon = <TagIcon sx={{ fontSize: 18, color: '#F59E0B' }} />;
  } else if (type === "Date") {
    bgcolor = 'rgba(139, 92, 246, 0.08)';
    border = '1px solid rgba(139, 92, 246, 0.15)';
    icon = <CalendarMonthIcon sx={{ fontSize: 18, color: '#8B5CF6' }} />;
  } else if (type === "Dropdown") {
    bgcolor = 'rgba(16, 185, 129, 0.08)';
    border = '1px solid rgba(16, 185, 129, 0.15)';
    icon = <ListIcon sx={{ fontSize: 18, color: '#10B981' }} />;
  } else if (type === "Checkbox") {
    bgcolor = 'rgba(239, 68, 68, 0.08)';
    border = '1px solid rgba(239, 68, 68, 0.15)';
    icon = <CheckBoxIcon sx={{ fontSize: 18, color: '#EF4444' }} />;
  }

  return (
    <Box sx={{
      width: 36,
      height: 36,
      borderRadius: '8px',
      bgcolor,
      border,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}>
      {icon}
    </Box>
  );
};

export default function IntakeFieldBuilderModal({ service, onClose, onSave, onBack }) {
  const initialFields = service?.intakeFields || [];

  const [fields, setFields] = useState(initialFields);

  // State for form adding / editing a field
  const [editingFieldId, setEditingFieldId] = useState(null); // Null means adding new field
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState("Text");
  const [required, setRequired] = useState(true);
  const [dropdownOptions, setDropdownOptions] = useState(""); // Comma separated options for dropdowns

  const [errors, setErrors] = useState({});
  const [resultModal, setResultModal] = useState(null);

  // Reset form states
  const resetForm = () => {
    setEditingFieldId(null);
    setLabel("");
    setFieldType("Text");
    setRequired(true);
    setDropdownOptions("");
    setErrors({});
  };

  const handleEditClick = (field) => {
    setEditingFieldId(field.id);
    setLabel(field.label);
    setFieldType(field.type);
    setRequired(field.required);
    setDropdownOptions(field.options ? field.options.join(", ") : "");
    setErrors({});
  };

  const handleAddField = () => {
    const e = {};
    if (!label.trim()) e.label = true;
    if (fieldType === "Dropdown" && !dropdownOptions.trim()) e.dropdownOptions = true;

    // Duplication Check: Allow same name OR same field type, but NOT both.
    // Meaning if both label AND type match an existing field, it's a duplicate.
    const isDuplicate = fields.some(f => 
      f.label.trim().toLowerCase() === label.trim().toLowerCase() && 
      f.type === fieldType && 
      f.id !== editingFieldId
    );

    if (isDuplicate) {
      setResultModal({
        type: "error",
        title: "Duplicate Field",
        message: `An intake field with the name "${label}" and type "${fieldType}" already exists.`
      });
      return;
    }

    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    const optionsArray = fieldType === "Dropdown"
      ? dropdownOptions.split(",").map(o => o.trim()).filter(Boolean)
      : undefined;

    if (editingFieldId !== null) {
      // Edit mode
      setFields(prev => prev.map(f => f.id === editingFieldId ? {
        ...f,
        label,
        type: fieldType,
        required,
        options: optionsArray,
      } : f));
    } else {
      // Add mode
      const newField = {
        id: Date.now(),
        label,
        type: fieldType,
        required,
        options: optionsArray,
        displayOrder: fields.length + 1,
      };
      setFields(prev => [...prev, newField]);
    }

    resetForm();
  };

  const handleDeleteField = (id) => {
    setFields(prev => prev.filter(f => f.id !== id).map((f, index) => ({
      ...f,
      displayOrder: index + 1,
    })));
  };

  const handleMove = (index, direction) => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === fields.length - 1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...fields];

    // Swap items
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    // Re-assign display orders
    const ordered = updated.map((f, i) => ({ ...f, displayOrder: i + 1 }));
    setFields(ordered);
  };

  const handleSaveAll = async () => {
    if (onSave) {
      try {
        await onSave({
          ...service,
          intakeFields: fields,
        });
        onClose();
      } catch (err) {
        console.error("Save intake fields failed:", err);
      }
    } else {
      onClose();
    }
  };

  return (
    <>
      <Dialog
        open
        onClose={(e, reason) => {
          if (reason !== "backdropClick") {
            onClose(e, reason);
          }
        }}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: { xs: 2, sm: 3 },
            mx: { xs: 1.5, sm: 'auto' },
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }
        }}
      >
        {/* Header */}
        <DialogTitle sx={{ fontWeight: 600, fontFamily: "'DM Serif Display', Georgia, serif", fontSize: { xs: '1.25rem', sm: '1.45rem' }, pb: 1, borderBottom: '1px solid #F1F5F9' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              Intake Field Builder
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, fontWeight: 500, fontSize: '12px' }}>
                Define required form fields for: <strong style={{ color: '#800000' }}>{service?.name || service?.serviceName}</strong>
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary', border: '1px solid #E2E8F0', borderRadius: 2 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        {/* Body Grid */}
        <DialogContent sx={{ pt: 3, px: { xs: 2, sm: 3 }, pb: 3, bgcolor: '#F8FAFC' }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
            {/* Left panel: Fields list */}
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#475569', mb: 1.5, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '11px' }}>
                Form Fields Registry ({fields.length})
              </Typography>
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                maxHeight: { xs: '360px', md: '440px' },
                ...(fields.length === 0 && { height: '100%', minHeight: '320px' }),
                overflowY: 'auto',
                pr: 0.5
              }}>
                {fields.length > 0 ? (
                  fields.map((field, index) => (
                    <Paper
                      key={field.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: '12px',
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        borderColor: '#E2E8F0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        borderLeft: `4px solid ${
                          field.type === 'Text' ? '#3B82F6' :
                          field.type === 'Number' ? '#F59E0B' :
                          field.type === 'Date' ? '#8B5CF6' :
                          field.type === 'Dropdown' ? '#10B981' :
                          field.type === 'Checkbox' ? '#EF4444' : '#64748B'
                        }`,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: '#CBD5E1',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                        }
                      }}
                    >
                      {/* Left details + icon */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                        {getFieldIconContainer(field.type)}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="subtitle2"
                            title={field.label}
                            sx={{
                              fontWeight: 700,
                              color: '#1E293B',
                              fontSize: '13.5px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {field.label}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '11px' }}>
                              Type: {field.type} · Order: {field.displayOrder}
                            </Typography>
                            {field.required && (
                              <Chip
                                label="Required"
                                size="small"
                                sx={{
                                  height: 16,
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  bgcolor: '#FEF2F2',
                                  color: '#EF4444',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(239, 68, 68, 0.12)',
                                  px: 0.5
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>

                      {/* Up Down arrows + Actions right */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Move Up" arrow>
                            <span>
                              <IconButton
                                size="small"
                                disabled={index === 0}
                                onClick={() => handleMove(index, "up")}
                                sx={{
                                  width: 28, height: 28, border: '1px solid #E2E8F0', borderRadius: 1.5, bgcolor: '#fff',
                                  '&:hover:not(:disabled)': { bgcolor: '#F1F5F9' }
                                }}
                              >
                                <ArrowUpwardIcon sx={{ fontSize: 13, color: '#64748B' }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Move Down" arrow>
                            <span>
                              <IconButton
                                size="small"
                                disabled={index === fields.length - 1}
                                onClick={() => handleMove(index, "down")}
                                sx={{
                                  width: 28, height: 28, border: '1px solid #E2E8F0', borderRadius: 1.5, bgcolor: '#fff',
                                  '&:hover:not(:disabled)': { bgcolor: '#F1F5F9' }
                                }}
                              >
                                <ArrowDownwardIcon sx={{ fontSize: 13, color: '#64748B' }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>

                        <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: '#CBD5E1' }} />

                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit Field" arrow>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleEditClick(field)}
                                sx={{
                                  border: '1px solid',
                                  borderColor: 'rgba(25, 118, 210, 0.2)',
                                  bgcolor: 'rgba(25, 118, 210, 0.04)',
                                  '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.08)' },
                                  width: 28,
                                  height: 28,
                                  borderRadius: 1.5,
                                  color: 'primary.main'
                                }}
                              >
                                <EditIcon sx={{ fontSize: 13 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Remove Field" arrow>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteField(field.id)}
                                sx={{
                                  border: '1px solid',
                                  borderColor: 'rgba(211, 47, 47, 0.2)',
                                  bgcolor: 'rgba(211, 47, 47, 0.04)',
                                  '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.08)' },
                                  width: 28,
                                  height: 28,
                                  borderRadius: 1.5,
                                  color: 'error.main'
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: 13 }} />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Paper>
                  ))
                ) : (
                  <Box sx={{
                    textAlign: 'center',
                    color: '#64748B',
                    fontSize: '14px',
                    fontWeight: 500,
                    border: '2px dashed #E2E8F0',
                    borderRadius: 3,
                    bgcolor: '#ffffff',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                    p: 4,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#CBD5E1'
                    }
                  }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#94A3B8', marginBottom: '16px' }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="9" y1="9" x2="15" y2="9" />
                      <line x1="9" y1="13" x2="15" y2="13" />
                      <line x1="9" y1="17" x2="13" y2="17" />
                    </svg>
                    <Typography sx={{ fontWeight: 600, color: '#475569', mb: 0.5, fontSize: '0.95rem' }}>
                      No Custom Intake Fields Yet
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8', maxWidth: '240px', display: 'block', lineHeight: 1.4 }}>
                      Use the form on the right to define required input fields.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Right panel: Add/Edit form */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  bgcolor: '#ffffff',
                  borderRadius: '16px',
                  borderColor: '#E2E8F0',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)',
                  minHeight: { xs: 'auto', md: '340px' },
                  height: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 800,
                    color: '#0F172A',
                    mb: 2.5,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontSize: '12px'
                  }}
                >
                  {editingFieldId !== null ? "Edit Intake Field" : "Add Intake Field"}
                </Typography>

                {/* Field Label */}
                <Box sx={{ mb: 2.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                    FIELD LABEL *
                  </Typography>
                  <TextField
                    placeholder="e.g. Reference Slip Number"
                    fullWidth
                    size="small"
                    value={label}
                    error={!!errors.label}
                    helperText={errors.label ? "Field label is required." : ""}
                    onChange={(e) => {
                      setLabel(e.target.value);
                      setErrors(prev => ({ ...prev, label: false }));
                    }}
                  />
                </Box>

                {/* Field Type */}
                <Box sx={{ mb: 2.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                    FIELD TYPE
                  </Typography>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={fieldType}
                    onChange={(e) => setFieldType(e.target.value)}
                  >
                    <MenuItem value="Text">Text Input</MenuItem>
                    <MenuItem value="Number">Number Input</MenuItem>
                    <MenuItem value="Date">Date Selector</MenuItem>
                    <MenuItem value="Dropdown">Dropdown Selector</MenuItem>
                    <MenuItem value="Checkbox">Checkbox Indicator</MenuItem>
                  </TextField>
                </Box>

                {/* Dropdown options */}
                {fieldType === "Dropdown" && (
                  <Box sx={{ mb: 2.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                      DROPDOWN OPTIONS (comma separated) *
                    </Typography>
                    <TextField
                      placeholder="e.g. Option 1, Option 2, Option 3"
                      fullWidth
                      size="small"
                      value={dropdownOptions}
                      error={!!errors.dropdownOptions}
                      helperText={errors.dropdownOptions ? "Dropdown options are required." : ""}
                      onChange={(e) => {
                        setDropdownOptions(e.target.value);
                        setErrors(prev => ({ ...prev, dropdownOptions: false }));
                      }}
                    />
                  </Box>
                )}

                {/* Required Indicator Toggle */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3.5, mt: 3 }}>
                  <Toggle checked={required} onChange={() => setRequired(p => !p)} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', letterSpacing: '0.05em' }}>
                    REQUIRED FIELD
                  </Typography>
                </Box>

                {/* Actions for local add/edit */}
                <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
                  {editingFieldId !== null && (
                    <Button
                      variant="outlined"
                      color="inherit"
                      fullWidth
                      onClick={resetForm}
                      sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{
                      bgcolor: editingFieldId !== null ? '#1E293B' : '#800000',
                      '&:hover': { bgcolor: editingFieldId !== null ? '#0F172A' : '#990000' },
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: '8px',
                      py: 1,
                      boxShadow: 'none'
                    }}
                    onClick={handleAddField}
                  >
                    {editingFieldId !== null ? "Update Field" : "Add Field"}
                  </Button>
                </Box>
              </Paper>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1.5, justifyContent: 'flex-end', gap: 1.5, borderTop: '1px solid #F1F5F9' }}>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => {
              if (service?.isNew && onBack) {
                onBack({
                  ...service,
                  intakeFields: fields,
                });
              } else {
                onClose();
              }
            }}
            sx={{ px: 3, borderRadius: '8px' }}
          >
            {service?.isNew ? "Back" : "Close"}
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAll}
            sx={{ bgcolor: '#15803D', '&:hover': { bgcolor: '#166534' }, px: 4, borderRadius: '8px', boxShadow: 'none' }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Result Modal for Validation Errors */}
      {resultModal && (
        <ResultModal
          type={resultModal.type}
          title={resultModal.title}
          message={resultModal.message}
          onClose={() => setResultModal(null)}
        />
      )}
    </>
  );
}
