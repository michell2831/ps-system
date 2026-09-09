import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Chip,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import BlockIcon from "@mui/icons-material/Block";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DateRangeIcon from "@mui/icons-material/DateRange";
import BusinessIcon from "@mui/icons-material/Business";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import TimelapseIcon from "@mui/icons-material/Timelapse";

import PageHeader from "../components/PageHeader";
import { useAppStore } from "../store/useAppStore";
import { api } from "../services/api";

const OFFICE_METAS = {
  "Campus Academic Office": {
    short: "ACAD",
    color: "#B45309",
    bg: "#FFFBEB",
    border: "#FDE68A",
  },
  "Campus Student Services and Affairs Office": {
    short: "OSAS",
    color: "#1E40AF",
    bg: "#EFF6FF",
    border: "#BFDBFE",
  },
  "Campus Administrative Office": {
    short: "ADMIN",
    color: "#065F46",
    bg: "#ECFDF5",
    border: "#A7F3D0",
  },
};

export default function PlanningTimeline({ onNavigate }) {
  const { permissions, createPeriod } = useAppStore();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [availableYears, setAvailableYears] = useState([currentYear]);
  const [timelinePeriods, setTimelinePeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Period Creation Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState("");
  const [newPeriodType, setNewPeriodType] = useState("Bi-Annual");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newIsActive, setNewIsActive] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const canAccess = Boolean(permissions?.canSeePlanningTimeline);
  const canWritePeriods = Boolean(permissions?.canWritePeriods || permissions?.role === "PlanningOfficer" || permissions?.role === "SuperAdmin");

  // Load timeline data for selected year
  const loadTimeline = useCallback(async (year) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getPlanningTimeline(year);
      const payload = res?.data ?? res ?? {};

      const periods = payload.periods || [];
      const years = payload.availableYears && payload.availableYears.length > 0
        ? payload.availableYears
        : [year || currentYear];

      setTimelinePeriods(periods);
      setAvailableYears(years);
      if (payload.year && payload.year !== selectedYear) {
        setSelectedYear(payload.year);
      }
    } catch (err) {
      console.error("Failed to load planning timeline:", err);
      setError(err?.message || "Failed to load planning timeline.");
    } finally {
      setLoading(false);
    }
  }, [selectedYear, currentYear]);

  useEffect(() => {
    if (canAccess) {
      loadTimeline(selectedYear);
    }
  }, [canAccess, selectedYear, loadTimeline]);

  // Handle year change without page reload (AC4)
  const handleYearChange = (e) => {
    const nextYear = Number(e.target.value);
    setSelectedYear(nextYear);
  };

  // Helper date formatter
  const formatDateRange = (startStr, endStr) => {
    if (!startStr || !endStr) return "Dates not defined";
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      return `${start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })} — ${end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;
    } catch {
      return "—";
    }
  };

  // Handle opening creation form
  const handleOpenCreate = () => {
    setNewPeriodName("");
    setNewPeriodType("Bi-Annual");
    setNewStartDate("");
    setNewEndDate("");
    setNewIsActive(false);
    setFormErrors({});
    setCreateModalOpen(true);
  };

  // Handle submitting new period (AC6)
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!newPeriodName.trim()) errors.name = "Period name is required.";
    if (!newStartDate) errors.startDate = "Start date is required.";
    if (!newEndDate) errors.endDate = "End date is required.";

    if (newStartDate && newEndDate && new Date(newStartDate) > new Date(newEndDate)) {
      errors.endDate = "End date must be on or after start date.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: newPeriodName.trim(),
        period_type: newPeriodType,
        start_date: newStartDate,
        end_date: newEndDate,
        is_active: newIsActive,
      };

      if (createPeriod) {
        await createPeriod(payload);
      } else {
        await api.createPeriod(payload);
      }

      setCreateModalOpen(false);
      setSuccessMessage(`Evaluation period "${newPeriodName.trim()}" created successfully!`);
      // Reload timeline data
      await loadTimeline(selectedYear);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error("Failed to create period:", err);
      setFormErrors({ submit: err?.message || "Failed to create evaluation period." });
    } finally {
      setSubmitting(false);
    }
  };

  // ── AC1: 403 Access Denied for unauthorized roles ──────────────────────────
  if (!canAccess) {
    return (
      <Box sx={{ p: 4, bgcolor: "#F8FAFC", minHeight: "100vh" }}>
        <PageHeader
          title="Planning Timeline"
          subtitle="Campus multi-period evaluation calendar and submission tracking"
        />
        <Paper
          elevation={0}
          sx={{
            p: 5,
            mt: 3,
            textAlign: "center",
            maxWidth: 600,
            mx: "auto",
            border: "1px solid #FECACA",
            borderRadius: 3,
            backgroundColor: "#FEF2F2",
          }}
        >
          <WarningAmberIcon sx={{ fontSize: 64, color: "#DC2626", mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#991B1B", mb: 1 }}>
            403 — Access Denied
          </Typography>
          <Typography variant="body1" sx={{ color: "#7F1D1D", mb: 3 }}>
            The Planning Timeline is restricted strictly to the <strong>Planning Officer</strong> and authorized administrators.
            Your current account permissions do not permit viewing campus-wide planning timelines.
          </Typography>
          <Button
            variant="contained"
            onClick={() => onNavigate && onNavigate("dashboard")}
            sx={{
              backgroundColor: "#580000",
              "&:hover": { backgroundColor: "#3b0000" },
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              px: 3,
            }}
          >
            Return to Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: "#F8FAFC", minHeight: "100vh" }}>
      {/* Header */}
      <PageHeader
        title="Planning Timeline"
        subtitle="Multi-period campus evaluation calendar & per-office OPCR submission oversight"
        actions={
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            {/* Year Filter Dropdown (AC4) */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="year-select-label" sx={{ fontSize: "0.875rem", fontWeight: 600 }}>
                Year
              </InputLabel>
              <Select
                labelId="year-select-label"
                id="year-select"
                value={selectedYear}
                label="Year"
                onChange={handleYearChange}
                disabled={loading}
                sx={{
                  bgcolor: "#FFFFFF",
                  borderRadius: 2,
                  fontSize: "0.875rem",
                  fontWeight: 600,
                }}
              >
                {availableYears.map((yr) => (
                  <MenuItem key={yr} value={yr}>
                    {yr}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Tooltip title="Refresh Timeline">
              <span>
                <IconButton
                  onClick={() => loadTimeline(selectedYear)}
                  disabled={loading}
                  sx={{
                    bgcolor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: 2,
                    p: 1,
                    "&:hover": { bgcolor: "#F1F5F9" },
                  }}
                >
                  <RefreshIcon fontSize="small" sx={{ color: "#475569" }} />
                </IconButton>
              </span>
            </Tooltip>

            {/* Create New Period Action (AC6) */}
            {canWritePeriods && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenCreate}
                sx={{
                  bgcolor: "var(--maroon, #580000)",
                  "&:hover": { bgcolor: "#3b0000" },
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  px: 2.5,
                  py: 0.9,
                }}
              >
                Create New Period
              </Button>
            )}
          </Box>
        }
      />

      {/* Success Notification */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          {successMessage}
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => loadTimeline(selectedYear)}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <Box sx={{ p: 8, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <CircularProgress sx={{ color: "var(--maroon, #580000)" }} />
        </Box>
      ) : timelinePeriods.length === 0 ? (
        /* AC8: Empty State when no periods exist for selected year */
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: "center",
            border: "1px dashed #CBD5E1",
            borderRadius: 3,
            bgcolor: "#FFFFFF",
            maxWidth: 600,
            mx: "auto",
            my: 4,
          }}
        >
          <CalendarMonthIcon sx={{ fontSize: 56, color: "#94A3B8", mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#1E293B", mb: 1 }}>
            No evaluation periods found for {selectedYear}
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
            Create an evaluation period to begin campus-wide planning and target collection for this calendar year.
          </Typography>
          {canWritePeriods && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              sx={{
                bgcolor: "var(--maroon, #580000)",
                "&:hover": { bgcolor: "#3b0000" },
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Create New Period
            </Button>
          )}
        </Paper>
      ) : (
        /* Multi-Period Timeline Horizontal / Grid Layout (AC2, AC3) */
        <Box sx={{ mt: 1 }}>
          {/* Summary Strip */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 3,
              p: 2,
              bgcolor: "#FFFFFF",
              borderRadius: 2,
              border: "1px solid #E2E8F0",
              flexWrap: "wrap",
              gap: 1.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <DateRangeIcon sx={{ color: "var(--maroon, #580000)" }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1E293B" }}>
                Evaluation Calendar Year {selectedYear}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>
              {timelinePeriods.length} Period{timelinePeriods.length > 1 ? "s" : ""} Configured
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {timelinePeriods.map((period, index) => {
              const isActive = period.status === "Active" || period.isActive;
              const isCompleted = period.status === "Completed";
              const isQueued = !isActive && !isCompleted;

              const statusBadgeConfig = isActive
                ? { label: "Active", bg: "#DCFCE7", text: "#15803D", border: "#BBF7D0", icon: <CheckCircleIcon style={{ fontSize: 13, color: "#15803D" }} /> }
                : isCompleted
                ? { label: "Completed", bg: "#F1F5F9", text: "#475569", border: "#E2E8F0", icon: <TaskAltIcon style={{ fontSize: 13, color: "#475569" }} /> }
                : { label: "Queued", bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE", icon: <HourglassEmptyIcon style={{ fontSize: 13, color: "#1D4ED8" }} /> };

              return (
                <Grid item xs={12} md={6} lg={4} key={period.id}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 3,
                      border: isActive ? "2px solid #22C55E" : "1px solid #E2E8F0",
                      bgcolor: "#FFFFFF",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      "&:hover": {
                        transform: "translateY(-3px)",
                        boxShadow: "0 12px 24px -8px rgba(0,0,0,0.08)",
                      },
                    }}
                  >
                    {/* Active Period Top Highlight Accent */}
                    {isActive && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 4,
                          bgcolor: "#22C55E",
                        }}
                      />
                    )}

                    <CardContent sx={{ p: 3, flex: 1, display: "flex", flexDirection: "column" }}>
                      {/* Top Row: Type & Status Badges */}
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                        <Chip
                          label={period.periodType || "Quarterly"}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.72rem",
                            bgcolor: "rgba(88, 0, 0, 0.08)",
                            color: "var(--maroon, #580000)",
                            borderRadius: 1.5,
                          }}
                        />
                        <Chip
                          icon={statusBadgeConfig.icon}
                          label={statusBadgeConfig.label}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.72rem",
                            bgcolor: statusBadgeConfig.bg,
                            color: statusBadgeConfig.text,
                            border: `1px solid ${statusBadgeConfig.border}`,
                            borderRadius: 1.5,
                          }}
                        />
                      </Box>

                      {/* Period Name */}
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 800,
                          color: "#0F172A",
                          fontSize: "1.05rem",
                          mb: 1.5,
                          lineHeight: 1.3,
                        }}
                      >
                        {period.name}
                      </Typography>

                      {/* Date Range & Duration */}
                      <Box sx={{ mb: 2.5, bgcolor: "#F8FAFC", p: 1.5, borderRadius: 2, border: "1px solid #F1F5F9" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                          <DateRangeIcon fontSize="small" sx={{ color: "#64748B", fontSize: 16 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#334155", fontSize: "0.8125rem" }}>
                            {formatDateRange(period.startDate, period.endDate)}
                          </Typography>
                        </Box>
                        {period.durationDays > 0 && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: 3 }}>
                            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 500 }}>
                              Duration: <strong>{period.durationDays} days</strong>
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Per-Office Submission Mini-Icons (AC3) */}
                      <Box sx={{ mb: 3 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: "#475569",
                            textTransform: "uppercase",
                            letterSpacing: 0.6,
                            display: "block",
                            mb: 1.2,
                          }}
                        >
                          Pilot Office Submissions
                        </Typography>

                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          {(period.offices || []).map((off) => {
                            const meta = OFFICE_METAS[off.office] || {
                              short: off.office?.slice(0, 4)?.toUpperCase() || "OFFC",
                              color: "#475569",
                              bg: "#F1F5F9",
                              border: "#CBD5E1",
                            };

                            const isOffSubmitted = off.status === "Submitted";
                            const isOffInProgress = off.status === "In Progress";
                            const isOffNotStarted = off.status === "Not Started";

                            return (
                              <Box
                                key={off.office}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  p: 1,
                                  borderRadius: 1.5,
                                  bgcolor: "#FFFFFF",
                                  border: "1px solid #E2E8F0",
                                }}
                              >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <Box
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      borderRadius: 1,
                                      bgcolor: meta.bg,
                                      border: `1px solid ${meta.border}`,
                                      color: meta.color,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: 800,
                                      fontSize: "0.68rem",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {meta.short}
                                  </Box>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      fontSize: "0.8rem",
                                      fontWeight: 600,
                                      color: "#334155",
                                      maxWidth: 160,
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {off.office}
                                  </Typography>
                                </Box>

                                {/* Status Mini Badge */}
                                {isOffSubmitted && (
                                  <Tooltip title="Submitted (Locked)">
                                    <Chip
                                      icon={<CheckCircleIcon style={{ fontSize: 12, color: "#15803D" }} />}
                                      label="Submitted"
                                      size="small"
                                      sx={{
                                        height: 22,
                                        fontSize: "0.68rem",
                                        fontWeight: 700,
                                        bgcolor: "#DCFCE7",
                                        color: "#15803D",
                                        border: "1px solid #BBF7D0",
                                      }}
                                    />
                                  </Tooltip>
                                )}
                                {isOffInProgress && (
                                  <Tooltip title="In Progress (Draft)">
                                    <Chip
                                      icon={<AccessTimeIcon style={{ fontSize: 12, color: "#B45309" }} />}
                                      label="Drafting"
                                      size="small"
                                      sx={{
                                        height: 22,
                                        fontSize: "0.68rem",
                                        fontWeight: 700,
                                        bgcolor: "#FEF3C7",
                                        color: "#B45309",
                                        border: "1px solid #FDE68A",
                                      }}
                                    />
                                  </Tooltip>
                                )}
                                {isOffNotStarted && (
                                  <Tooltip title="Not Started">
                                    <Chip
                                      icon={<BlockIcon style={{ fontSize: 12, color: "#64748B" }} />}
                                      label="Not Started"
                                      size="small"
                                      sx={{
                                        height: 22,
                                        fontSize: "0.68rem",
                                        fontWeight: 600,
                                        bgcolor: "#F1F5F9",
                                        color: "#64748B",
                                        border: "1px solid #E2E8F0",
                                      }}
                                    />
                                  </Tooltip>
                                )}
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>

                      {/* Action Button: View OPCR Status (AC5) */}
                      <Box sx={{ mt: "auto", pt: 1 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          endIcon={<ArrowForwardIcon fontSize="small" />}
                          onClick={() => {
                            if (onNavigate) {
                              onNavigate("opcrTracker");
                            }
                          }}
                          sx={{
                            textTransform: "none",
                            fontWeight: 700,
                            fontSize: "0.8125rem",
                            borderRadius: 2,
                            borderColor: "#CBD5E1",
                            color: "var(--maroon, #580000)",
                            "&:hover": {
                              borderColor: "var(--maroon, #580000)",
                              bgcolor: "rgba(88, 0, 0, 0.04)",
                            },
                          }}
                        >
                          View OPCR Status
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* AC6: Create New Period Dialog */}
      <Dialog
        open={createModalOpen}
        onClose={() => !submitting && setCreateModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 1 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "#0F172A", fontSize: "1.15rem", pb: 1 }}>
          Create Evaluation Period
        </DialogTitle>
        <form onSubmit={handleCreateSubmit}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
            {formErrors.submit && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {formErrors.submit}
              </Alert>
            )}

            <TextField
              label="Period Name"
              placeholder="e.g. Q3 2026 Evaluation Period"
              value={newPeriodName}
              onChange={(e) => setNewPeriodName(e.target.value)}
              error={Boolean(formErrors.name)}
              helperText={formErrors.name}
              required
              fullWidth
              size="small"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
            />

            <FormControl size="small" fullWidth>
              <InputLabel id="period-type-label">Period Type</InputLabel>
              <Select
                labelId="period-type-label"
                id="period-type-select"
                value={newPeriodType}
                label="Period Type"
                onChange={(e) => setNewPeriodType(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="Quarterly">Quarterly</MenuItem>
                <MenuItem value="Semestral">Semestral</MenuItem>
                <MenuItem value="Bi-Annual">Bi-Annual</MenuItem>
                <MenuItem value="Annual">Annual</MenuItem>
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  error={Boolean(formErrors.startDate)}
                  helperText={formErrors.startDate}
                  InputLabelProps={{ shrink: true }}
                  required
                  fullWidth
                  size="small"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="End Date"
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  error={Boolean(formErrors.endDate)}
                  helperText={formErrors.endDate}
                  InputLabelProps={{ shrink: true }}
                  required
                  fullWidth
                  size="small"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              </Grid>
            </Grid>

            <FormControlLabel
              control={
                <Checkbox
                  checked={newIsActive}
                  onChange={(e) => setNewIsActive(e.target.checked)}
                  sx={{ color: "var(--maroon, #580000)", "&.Mui-checked": { color: "var(--maroon, #580000)" } }}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 500, color: "#334155" }}>
                  Set as Active Evaluation Period
                </Typography>
              }
            />
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setCreateModalOpen(false)}
              disabled={submitting}
              sx={{ textTransform: "none", fontWeight: 600, color: "#64748B" }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{
                bgcolor: "var(--maroon, #580000)",
                "&:hover": { bgcolor: "#3b0000" },
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
              }}
            >
              {submitting ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : "Create Period"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
