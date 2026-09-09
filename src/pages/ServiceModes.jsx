import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Menu,
  Divider,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Chip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  LockOutlined as LockOutlinedIcon,
  Layers as LayersIcon,
  MoreHoriz as MoreHorizIcon,
} from "@mui/icons-material";

import { useAppStore } from "../store/useAppStore";
import PageHeader from "../components/PageHeader";
import ResultModal from "../modals/ResultModal";
import ToggleStatusModal from "../modals/ToggleStatusModal";

export default function ServiceModes() {
  const {
    serviceModes,
    fetchServiceModes,
    createServiceMode,
    updateServiceMode,
    toggleServiceMode,
    permissions,
    loadingServiceModes,
  } = useAppStore();

  const canWrite = permissions?.canWriteServiceModes || false;

  // UI State
  const [activeTab, setActiveTab] = useState(0); // 0: active, 1: inactive
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMode, setEditingMode] = useState(null); // null = add, obj = edit

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Feedback
  const [resultModal, setResultModal] = useState({ show: false, type: "success", title: "", message: "" });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // 3-dot Action Menu & Toggle Modal State
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [togglingMode, setTogglingMode] = useState(null);

  const handleMenuOpen = (event, mode) => {
    setAnchorEl(event.currentTarget);
    setSelectedMode(mode);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    if (selectedMode) {
      openEdit(selectedMode);
    }
    handleMenuClose();
  };

  const handleToggleClick = () => {
    if (selectedMode) {
      setTogglingMode(selectedMode);
    }
    handleMenuClose();
  };

  const confirmToggle = async () => {
    if (!togglingMode) return;
    const mode = togglingMode;
    setTogglingMode(null);
    try {
      await toggleServiceMode(mode.id);
      setResultModal({
        show: true,
        type: "success",
        title: mode.is_active !== false ? "Service Mode Deactivated" : "Service Mode Activated",
        message: mode.is_active !== false
          ? `"${mode.name}" has been deactivated and will not appear in service forms.`
          : `"${mode.name}" is now active and available in service forms.`,
      });
    } catch (err) {
      setResultModal({
        show: true,
        type: "error",
        title: "Operation Failed",
        message: err.message || "Failed to update service mode status.",
      });
    }
  };

  useEffect(() => {
    // Planning Officer / Super Admin see all modes (incl. inactive)
    fetchServiceModes(canWrite);
  }, [canWrite]);

  // Filtered list
  const filteredModes = (Array.isArray(serviceModes) ? serviceModes : []).filter((m) => {
    if (!m) return false;
    const isActive = m.is_active !== false;
    const tabMatch = activeTab === 0 ? isActive : !isActive;
    if (!tabMatch) return false;
    const q = (searchQuery || "").toLowerCase();
    const name = (m.name || "").toLowerCase();
    const desc = (m.description || "").toLowerCase();
    return name.includes(q) || desc.includes(q);
  });

  const openAdd = () => {
    setEditingMode(null);
    setFormName("");
    setFormDescription("");
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEdit = (mode) => {
    setEditingMode(mode);
    setFormName(mode?.name || "");
    setFormDescription(mode?.description || "");
    setFormErrors({});
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingMode(null);
  };

  const validate = () => {
    const errs = {};
    if (!formName.trim()) errs.name = "Mode name is required.";
    else if (formName.trim().length > 100) errs.name = "Name must not exceed 100 characters.";

    // Check name uniqueness across all modes (except current editing)
    const duplicate = (Array.isArray(serviceModes) ? serviceModes : []).find(
      (m) =>
        m &&
        (m.name || "").trim().toLowerCase() === formName.trim().toLowerCase() &&
        m.id !== editingMode?.id
    );
    if (duplicate) errs.name = `A service mode named "${formName.trim()}" already exists.`;

    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
      };

      if (editingMode) {
        await updateServiceMode(editingMode.id, payload);
        setResultModal({
          show: true,
          type: "success",
          title: "Service Mode Updated!",
          message: `"${payload.name}" has been updated successfully.`,
        });
      } else {
        await createServiceMode(payload);
        setResultModal({
          show: true,
          type: "success",
          title: "Service Mode Added!",
          message: `"${payload.name}" has been added to the library.`,
        });
      }
      closeDialog();
    } catch (err) {
      setResultModal({
        show: true,
        type: "error",
        title: "Operation Failed",
        message: err.message || "Failed to save service mode. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (mode) => {
    try {
      await toggleServiceMode(mode.id);
      setResultModal({
        show: true,
        type: "success",
        title: mode.is_active ? "Service Mode Deactivated" : "Service Mode Activated",
        message: mode.is_active
          ? `"${mode.name}" has been deactivated and will not appear in service forms.`
          : `"${mode.name}" is now active and available in service forms.`,
      });
    } catch (err) {
      setResultModal({
        show: true,
        type: "error",
        title: "Operation Failed",
        message: err.message || "Failed to update service mode status.",
      });
    }
  };

  const SHARED_FIELD_SX = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
      backgroundColor: "#FFFFFF",
      fontSize: "0.875rem",
      "& fieldset": { borderColor: "#CBD5E1" },
      "&:hover fieldset": { borderColor: "#94A3B8" },
      "&.Mui-focused fieldset": { borderColor: "#580000", borderWidth: "1px" },
    },
    "& .MuiInputLabel-root.Mui-focused": { color: "#580000" },
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, bgcolor: "#F8FAFC", minHeight: "100vh" }}>
      <PageHeader
        breadcrumb="Service Modes"
        title="Service Mode Library"
        subtitle="Manage the delivery mode options available in the service catalogue."
      />

      {/* Read-Only Notice */}
      {!canWrite && (
        <Alert
          icon={<LockOutlinedIcon fontSize="inherit" />}
          severity="info"
          sx={{
            mb: 3,
            borderRadius: "8px",
            bgcolor: "#F0F9FF",
            color: "#0369A1",
            border: "1px solid #BAE6FD",
            fontWeight: 500,
            fontSize: "0.875rem",
            "& .MuiAlert-icon": { color: "#0369A1" },
          }}
        >
          Service mode configurations are managed by the Planning Officer. You
          have <strong>read-only</strong> access to this library.
        </Alert>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => {
          setActiveTab(v);
          setSearchQuery("");
        }}
        textColor="primary"
        indicatorColor="primary"
        sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
      >
        <Tab label="Active Modes" sx={{ fontWeight: 700 }} />
        <Tab label="Inactive Modes" sx={{ fontWeight: 700 }} />
      </Tabs>

      {/* Toolbar */}
      <Box sx={{ display: "flex", gap: { xs: 1.5, sm: 2 }, flexWrap: "wrap", alignItems: "flex-end", mb: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, width: { xs: canWrite ? "calc(50% - 6px)" : "100%", sm: "auto" } }}>
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "#64748B",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Search
          </Typography>
          <TextField
            placeholder="Search mode name..."
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94A3B8", fontSize: 18 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              width: { xs: "100%", sm: 300 },
              "& .MuiOutlinedInput-root": {
                borderRadius: "6px",
                backgroundColor: "#FFFFFF",
                height: "38px",
                fontSize: { xs: "0.8rem", sm: "0.875rem" },
                color: "#1E293B",
                "& fieldset": { borderColor: "#CBD5E1" },
                "&:hover fieldset": { borderColor: "#94A3B8" },
                "&.Mui-focused fieldset": { borderColor: "#64748B", borderWidth: "1px" },
              },
            }}
          />
        </Box>

        {canWrite && (
          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={openAdd}
            sx={{
              ml: { xs: 0, sm: "auto" },
              width: { xs: "calc(50% - 6px)", sm: "auto" },
              height: "38px",
              bgcolor: "#580000",
              color: "#ffffff",
              "&:hover": {
                bgcolor: "#700000",
                boxShadow: "0 4px 12px rgba(88, 0, 0, 0.25)",
              },
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: { xs: "0.78rem", sm: "0.875rem" },
              textTransform: "none",
              px: { xs: 1.5, sm: 2.5 },
              whiteSpace: "nowrap",
              boxShadow: "0 2px 4px rgba(88, 0, 0, 0.16)",
              transition: "all 0.2s ease",
            }}
          >
            Add Service Mode
          </Button>
        )}
      </Box>

      {/* Table */}
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: "8px",
          border: "1px solid #E2E8F0",
          mb: 3,
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        }}
      >
        <Table>
          <TableHead>
            <TableRow
              sx={{
                bgcolor: "#580000",
                "& .MuiTableCell-root": { py: 1.5, whiteSpace: "nowrap" },
              }}
            >
              <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff" }}>
                MODE NAME
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff" }}>
                DESCRIPTION
              </TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff" }}>
                STATUS
              </TableCell>
              {canWrite && (
                <TableCell
                  align="center"
                  sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff", width: 140 }}
                >
                  ACTIONS
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loadingServiceModes ? (
              <TableRow>
                <TableCell colSpan={canWrite ? 4 : 3} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={28} sx={{ color: "#580000" }} />
                </TableCell>
              </TableRow>
            ) : filteredModes.length > 0 ? (
              filteredModes.map((mode) => {
                const isActive = mode.is_active !== false;
                return (
                  <TableRow
                    key={mode.id}
                    hover
                    sx={{
                      opacity: isActive ? 1 : 0.6,
                      "& .MuiTableCell-root": {
                        py: 1.5,
                        borderBottom: "1px solid #CBD5E1",
                        boxShadow: "inset 0 -1.5px 0 0 rgba(0, 0, 0, 0.04)",
                      },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: "8px",
                            bgcolor: isActive ? "#FFF1F1" : "#F1F5F9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <LayersIcon
                            sx={{ fontSize: 16, color: isActive ? "#580000" : "#94A3B8" }}
                          />
                        </Box>
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            color: isActive ? "#1E293B" : "#64748B",
                          }}
                        >
                          {mode.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.8125rem",
                        color: "text.secondary",
                        maxWidth: 400,
                      }}
                    >
                      {mode.description || (
                        <Typography color="text.disabled" sx={{ fontStyle: "italic", fontSize: "0.8125rem" }}>
                          No description
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={isActive ? "Active" : "Inactive"}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          ...(isActive
                            ? {
                                bgcolor: "#ECFDF5",
                                color: "#059669",
                                border: "1px solid rgba(5, 150, 105, 0.15)",
                              }
                            : {
                                bgcolor: "#F1F5F9",
                                color: "#64748B",
                                border: "1px solid rgba(100, 116, 139, 0.1)",
                              }),
                        }}
                      />
                    </TableCell>
                    {canWrite && (
                      <TableCell align="center">
                        <Tooltip title="Actions" arrow>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, mode)}
                            sx={{
                              color: "#64748B",
                              "&:hover": { bgcolor: "rgba(0, 0, 0, 0.04)" },
                              width: 32,
                              height: 32,
                            }}
                          >
                            <MoreHorizIcon sx={{ fontSize: 20 }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={canWrite ? 4 : 3} align="center" sx={{ py: 6 }}>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                    <LayersIcon sx={{ fontSize: 40, color: "#CBD5E1" }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      {searchQuery
                        ? "No service modes match your search."
                        : activeTab === 0
                          ? !canWrite
                            ? "No service modes configured. Contact your Planning Officer."
                            : "No active service modes. Click \"Add Service Mode\" to get started."
                          : "No inactive service modes."}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: "12px", p: 0 },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 3,
            py: 2.5,
            borderBottom: "1px solid #F1F5F9",
            fontWeight: 700,
            fontSize: "1rem",
            color: "#1E293B",
          }}
        >
          {editingMode ? "Edit Service Mode" : "Add Service Mode"}
          <IconButton size="small" onClick={closeDialog} sx={{ color: "#94A3B8" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 3, py: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box>
              <Typography
                sx={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "#334155",
                  mb: 0.75,
                }}
              >
                Mode Name <Box component="span" sx={{ color: "#DC2626" }}>*</Box>
              </Typography>
              <TextField
                placeholder="e.g., Online, Walk-in, Email..."
                fullWidth
                size="small"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (formErrors.name) setFormErrors((p) => ({ ...p, name: undefined }));
                }}
                error={!!formErrors.name}
                helperText={formErrors.name}
                autoFocus
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "6px",
                    "&:hover fieldset": { borderColor: "#94A3B8" },
                    "&.Mui-focused fieldset": { borderColor: "#580000" },
                  },
                }}
              />
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "#334155",
                  mb: 0.75,
                }}
              >
                Description
              </Typography>
              <TextField
                placeholder="Optional — briefly describe when this mode applies."
                fullWidth
                multiline
                minRows={3}
                maxRows={5}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "6px",
                    "&:hover fieldset": { borderColor: "#94A3B8" },
                    "&.Mui-focused fieldset": { borderColor: "#580000" },
                  },
                }}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid #F1F5F9",
            gap: 1,
          }}
        >
          <Button
            onClick={closeDialog}
            variant="outlined"
            sx={{
              borderColor: "#CBD5E1",
              color: "#475569",
              fontWeight: 600,
              textTransform: "none",
              borderRadius: "6px",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving}
            sx={{
              bgcolor: "#580000",
              "&:hover": { bgcolor: "#700000" },
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "6px",
              minWidth: 100,
            }}
          >
            {saving ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : editingMode ? "Save Changes" : "Add Mode"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* 3-Dot Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        TransitionProps={{
          onExited: () => setSelectedMode(null)
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            elevation: 2,
            sx: {
              minWidth: 170,
              borderRadius: 2,
              mt: 0.5,
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
              '& .MuiMenuItem-root': {
                py: 1.2,
                px: 2,
              }
            }
          }
        }}
      >
        <MenuItem onClick={handleEditClick}>
          <EditIcon sx={{ mr: 1.5, color: '#800000', fontSize: 18 }} />
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Edit Mode</Typography>
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        {selectedMode?.is_active !== false ? (
          <MenuItem onClick={handleToggleClick}>
            <BlockIcon sx={{ mr: 1.5, color: '#d32f2f', fontSize: 18 }} />
            <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#d32f2f' }}>Deactivate</Typography>
          </MenuItem>
        ) : (
          <MenuItem onClick={handleToggleClick}>
            <CheckCircleIcon sx={{ mr: 1.5, color: '#2e7d32', fontSize: 18 }} />
            <Typography variant="body2" sx={{ fontSize: '0.875rem', color: '#2e7d32' }}>Activate</Typography>
          </MenuItem>
        )}
      </Menu>

      {/* Toggle Status Confirmation Modal */}
      {togglingMode && (
        <ToggleStatusModal
          open={Boolean(togglingMode)}
          isActivate={togglingMode.is_active === false}
          itemName={togglingMode.name}
          entityLabel="Service Mode"
          bodyExtra={
            togglingMode.is_active !== false
              ? "Deactivating this service mode will prevent it from being selected in service forms."
              : "Activating this service mode will make it available for selection across all services."
          }
          onConfirm={confirmToggle}
          onCancel={() => setTogglingMode(null)}
        />
      )}

      {/* Result Modal */}
      {resultModal.show && (
        <ResultModal
          type={resultModal.type}
          title={resultModal.title}
          message={resultModal.message}
          onClose={() => setResultModal((p) => ({ ...p, show: false }))}
        />
      )}
    </Box>
  );
}
