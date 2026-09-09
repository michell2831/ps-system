import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Chip,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import BlockIcon from "@mui/icons-material/Block";
import VisibilityIcon from "@mui/icons-material/Visibility";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DateRangeIcon from "@mui/icons-material/DateRange";
import BusinessIcon from "@mui/icons-material/Business";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonIcon from "@mui/icons-material/Person";
import FolderSharedOutlinedIcon from "@mui/icons-material/FolderSharedOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import PageHeader from "../components/PageHeader";
import ViewCommitmentDetail from "./ViewCommitmentDetail";
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

export default function CampusOpcrTracker({ onNavigate }) {
  const { permissions, periods, fetchPeriods } = useAppStore();

  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  const [error, setError] = useState(null);
  const [trackerData, setTrackerData] = useState({
    periodId: "",
    offices: [],
    generatedAt: null,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedCommitmentId, setSelectedCommitmentId] = useState(null);
  const [selectedOfficeForHistory, setSelectedOfficeForHistory] = useState(null);

  const canAccess = Boolean(permissions?.canSeeOpcrTracker);

  // Load periods on mount
  useEffect(() => {
    let mounted = true;
    const initPeriods = async () => {
      try {
        setLoadingPeriods(true);
        await fetchPeriods();
      } catch (err) {
        if (mounted) {
          setError("Failed to load evaluation periods. Please try again.");
        }
      } finally {
        if (mounted) {
          setLoadingPeriods(false);
        }
      }
    };
    initPeriods();
    return () => {
      mounted = false;
    };
  }, [fetchPeriods]);

  // Set default period once periods are available
  useEffect(() => {
    if (periods && periods.length > 0 && !selectedPeriodId) {
      const activePeriod = periods.find((p) => p.status === "Active" || p.is_active);
      const defaultPeriod = activePeriod || periods[0];
      if (defaultPeriod) {
        setSelectedPeriodId(defaultPeriod.id);
      }
    }
  }, [periods, selectedPeriodId]);

  // Fetch OPCR status whenever selectedPeriodId changes
  const loadOpcrStatus = useCallback(async (periodId) => {
    if (!periodId) {
      setTrackerData({ periodId: "", offices: [], generatedAt: null });
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.getOpcrStatus(periodId);
      const payload = res?.data ?? res ?? {};
      setTrackerData({
        periodId: payload.periodId || periodId,
        offices: payload.offices || [],
        generatedAt: payload.generatedAt || new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to load Campus OPCR Tracker data:", err);
      setError(err?.message || "Failed to load OPCR submission status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canAccess && selectedPeriodId) {
      loadOpcrStatus(selectedPeriodId);
    }
  }, [canAccess, selectedPeriodId, loadOpcrStatus]);

  // Summary counts
  const summaryCounts = useMemo(() => {
    const offices = trackerData.offices || [];
    let submitted = 0;
    let inProgress = 0;
    let notStarted = 0;

    offices.forEach((item) => {
      if (item.status === "Submitted") submitted += 1;
      else if (item.status === "In Progress") inProgress += 1;
      else notStarted += 1;
    });

    return {
      submitted,
      inProgress,
      notStarted,
      total: offices.length,
    };
  }, [trackerData.offices]);

  // Filtered offices table list
  const filteredOffices = useMemo(() => {
    let list = trackerData.offices || [];

    if (statusFilter !== "ALL") {
      list = list.filter((item) => item.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter((item) => item.office?.toLowerCase().includes(query));
    }

    return list;
  }, [trackerData.offices, statusFilter, searchQuery]);

  // Helper for formatting date
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  // ── AC1: Access Denied 403 screen for non-Planning Officers ──────────────────
  if (!canAccess) {
    return (
      <Box sx={{ p: 4, bgcolor: "#F8FAFC", minHeight: "100vh" }}>
        <PageHeader
          title="Campus OPCR Tracker"
          subtitle="Campus-wide OPCR commitment submission status oversight"
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
            The Campus OPCR Tracker is restricted strictly to the <strong>Planning Officer</strong> role.
            Your current account permissions do not permit viewing campus-wide submission statuses.
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

  // ── AC5: Read-only Commitment Detail View ─────────────────────────────────
  if (selectedCommitmentId) {
    return (
      <ViewCommitmentDetail
        commitmentId={selectedCommitmentId}
        onBack={() => setSelectedCommitmentId(null)}
      />
    );
  }

  // ── Full-Page Office Commitment Records & History View ───────────────────
  if (selectedOfficeForHistory) {
    return (
      <OfficeCommitmentsView
        officeName={selectedOfficeForHistory}
        periods={periods}
        onBack={() => setSelectedOfficeForHistory(null)}
        onViewCommitment={(id) => setSelectedCommitmentId(id)}
      />
    );
  }

  const selectedPeriodObj = periods.find((p) => p.id === selectedPeriodId);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: "#F8FAFC", minHeight: "100vh" }}>
      {/* Header */}
      <PageHeader
        title="Campus OPCR Tracker"
        subtitle="Track and oversee OPCR commitment submissions and drafting progress across all campus offices"
        actions={
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            {/* Period Selector */}
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel id="period-select-label" sx={{ fontSize: "0.875rem", fontWeight: 600 }}>
                Evaluation Period
              </InputLabel>
              <Select
                labelId="period-select-label"
                id="period-select"
                value={selectedPeriodId}
                label="Evaluation Period"
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                disabled={loadingPeriods}
                sx={{
                  bgcolor: "#FFFFFF",
                  borderRadius: 2,
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                {periods.map((p) => {
                  const isActive = p.status === "Active" || p.is_active;
                  return (
                    <MenuItem key={p.id} value={p.id}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                        <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
                          {p.name || `${p.year} ${p.semester}`}
                        </Typography>
                        {isActive && (
                          <Chip
                            label="Active"
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              bgcolor: "#DCFCE7",
                              color: "#15803D",
                              ml: "auto",
                            }}
                          />
                        )}
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            <Tooltip title="Refresh Statuses">
              <span>
                <IconButton
                  onClick={() => selectedPeriodId && loadOpcrStatus(selectedPeriodId)}
                  disabled={loading || !selectedPeriodId}
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
          </Box>
        }
      />

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => selectedPeriodId && loadOpcrStatus(selectedPeriodId)}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* AC8: Empty State when no period is selected */}
      {!selectedPeriodId && !loadingPeriods && (
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
          <DateRangeIcon sx={{ fontSize: 56, color: "#94A3B8", mb: 2 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#1E293B", mb: 1 }}>
            No evaluation period selected
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
            Select an evaluation period from the dropdown above to view submission status across all offices.
          </Typography>
        </Paper>
      )}

      {/* Main Content Area */}
      {selectedPeriodId && (
        <>
          {/* Active Period Info Banner */}
          {selectedPeriodObj && (
            <Box
              sx={{
                mb: 3,
                p: 2,
                bgcolor: "#FFFFFF",
                borderRadius: 2,
                border: "1px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: "rgba(88, 0, 0, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--maroon, #580000)",
                  }}
                >
                  <DateRangeIcon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1E293B" }}>
                    {selectedPeriodObj.name || `Evaluation Period ${selectedPeriodObj.year || ""}`}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748B" }}>
                    {selectedPeriodObj.start_date && selectedPeriodObj.end_date
                      ? `${new Date(selectedPeriodObj.start_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })} — ${new Date(selectedPeriodObj.end_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}`
                      : "Date range not set"}
                  </Typography>
                </Box>
              </Box>

              {trackerData.generatedAt && (
                <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                  Updated at {formatDate(trackerData.generatedAt)}
                </Typography>
              )}
            </Box>
          )}

          {/* Status Summary Bar (Professional Dashboard Stat Cards) */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: { xs: 1, sm: 2, md: "20px" },
              mb: 3.5,
            }}
          >
            {/* Card 1: Submitted (Locked) */}
            <Box
              sx={{
                bgcolor: "#FFFFFF",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
                p: { xs: "12px 10px", sm: "16px 18px", md: "20px 24px" },
                pt: { xs: "16px", sm: "20px", md: "24px" },
                minHeight: { xs: 100, sm: 118 },
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxSizing: "border-box",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.2s ease",
                "&:hover": { transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
              }}
            >
              <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", bgcolor: "#10B981" }} />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, mb: 0.75, flexWrap: "wrap", gap: 0.5 }}>
                <Typography sx={{ fontSize: { xs: 9.5, sm: 11 }, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Submitted (Locked)
                </Typography>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: { xs: "5px", sm: "8px" },
                    py: { xs: "1px", sm: "2px" },
                    borderRadius: "9999px",
                    fontSize: { xs: 9, sm: 10.5 },
                    fontWeight: 700,
                    bgcolor: "#ECFDF5",
                    color: "#047857",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#047857" }} />
                  Locked
                </Box>
              </Box>
              <Box sx={{ my: 0.5 }}>
                <Typography sx={{ fontSize: { xs: 22, sm: 28, md: 36 }, fontWeight: 600, color: "#0F172A", lineHeight: 1 }}>
                  {loading ? <CircularProgress size={20} sx={{ color: "#10B981" }} /> : summaryCounts.submitted}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: { xs: 10.5, sm: 12, md: 13 }, color: "#475569", fontWeight: 500, lineHeight: 1.2 }}>
                {summaryCounts.total > 0
                  ? `${Math.round((summaryCounts.submitted / summaryCounts.total) * 100)}% of pilot offices locked`
                  : "No submission recorded"}
              </Typography>
            </Box>

            {/* Card 2: In Progress (Draft) */}
            <Box
              sx={{
                bgcolor: "#FFFFFF",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
                p: { xs: "12px 10px", sm: "16px 18px", md: "20px 24px" },
                pt: { xs: "16px", sm: "20px", md: "24px" },
                minHeight: { xs: 100, sm: 118 },
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxSizing: "border-box",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.2s ease",
                "&:hover": { transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
              }}
            >
              <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", bgcolor: "#F59E0B" }} />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, mb: 0.75, flexWrap: "wrap", gap: 0.5 }}>
                <Typography sx={{ fontSize: { xs: 9.5, sm: 11 }, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  In Progress (Draft)
                </Typography>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: { xs: "5px", sm: "8px" },
                    py: { xs: "1px", sm: "2px" },
                    borderRadius: "9999px",
                    fontSize: { xs: 9, sm: 10.5 },
                    fontWeight: 700,
                    bgcolor: "#FFFBEB",
                    color: "#B45309",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#B45309" }} />
                  Drafting
                </Box>
              </Box>
              <Box sx={{ my: 0.5 }}>
                <Typography sx={{ fontSize: { xs: 22, sm: 28, md: 36 }, fontWeight: 600, color: "#0F172A", lineHeight: 1 }}>
                  {loading ? <CircularProgress size={20} sx={{ color: "#F59E0B" }} /> : summaryCounts.inProgress}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: { xs: 10.5, sm: 12, md: 13 }, color: "#475569", fontWeight: 500, lineHeight: 1.2 }}>
                Currently drafting / pending lock
              </Typography>
            </Box>

            {/* Card 3: Not Started */}
            <Box
              sx={{
                bgcolor: "#FFFFFF",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
                p: { xs: "12px 10px", sm: "16px 18px", md: "20px 24px" },
                pt: { xs: "16px", sm: "20px", md: "24px" },
                minHeight: { xs: 100, sm: 118 },
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxSizing: "border-box",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                position: "relative",
                overflow: "hidden",
                transition: "all 0.2s ease",
                "&:hover": { transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
              }}
            >
              <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", bgcolor: "#64748B" }} />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, mb: 0.75, flexWrap: "wrap", gap: 0.5 }}>
                <Typography sx={{ fontSize: { xs: 9.5, sm: 11 }, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Not Started
                </Typography>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: { xs: "5px", sm: "8px" },
                    py: { xs: "1px", sm: "2px" },
                    borderRadius: "9999px",
                    fontSize: { xs: 9, sm: 10.5 },
                    fontWeight: 700,
                    bgcolor: "#F1F5F9",
                    color: "#475569",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#94A3B8" }} />
                  Pending
                </Box>
              </Box>
              <Box sx={{ my: 0.5 }}>
                <Typography sx={{ fontSize: { xs: 22, sm: 28, md: 36 }, fontWeight: 600, color: "#0F172A", lineHeight: 1 }}>
                  {loading ? <CircularProgress size={20} sx={{ color: "#64748B" }} /> : summaryCounts.notStarted}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: { xs: 10.5, sm: 12, md: 13 }, color: "#475569", fontWeight: 500, lineHeight: 1.2 }}>
                No draft commitment initialized
              </Typography>
            </Box>
          </Box>

          {/* Search & Filters Bar */}
          <Box sx={{ display: "flex", gap: { xs: 1.5, sm: 2 }, flexWrap: "wrap", alignItems: "flex-end", mb: 3, justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", gap: { xs: 1.5, sm: 2 }, flexWrap: "wrap", alignItems: "flex-end", width: { xs: "100%", md: "auto" } }}>
              {/* Search Field */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, width: { xs: "calc(50% - 6px)", sm: 260 } }}>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Search Office
                </Typography>
                <TextField
                  placeholder="Search office..."
                  size="small"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: "#94A3B8", fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    width: "100%",
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

              {/* Status Filter */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, width: { xs: "calc(50% - 6px)", sm: 160 } }}>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Status Filter
                </Typography>
                <FormControl size="small" sx={{ width: "100%" }}>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{
                      borderRadius: "6px",
                      backgroundColor: "#FFFFFF",
                      height: "38px",
                      fontSize: { xs: "0.8rem", sm: "0.875rem" },
                      fontWeight: 500,
                      "& fieldset": { borderColor: "#CBD5E1" },
                      "&:hover fieldset": { borderColor: "#94A3B8" },
                    }}
                  >
                    <MenuItem value="ALL">All Statuses</MenuItem>
                    <MenuItem value="Submitted">Submitted (Locked)</MenuItem>
                    <MenuItem value="In Progress">In Progress (Draft)</MenuItem>
                    <MenuItem value="Not Started">Not Started</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {(searchQuery || statusFilter !== "ALL") && (
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                  }}
                  sx={{
                    height: "38px",
                    textTransform: "none",
                    borderColor: "#E2E8F0",
                    color: "#475569",
                    borderRadius: "6px",
                    fontWeight: 600,
                    fontSize: { xs: "0.78rem", sm: "0.875rem" },
                    width: { xs: "100%", sm: "auto" },
                    px: { xs: 1.5, sm: 2 },
                    "&:hover": {
                      borderColor: "#CBD5E1",
                      backgroundColor: "#F8FAFC",
                    },
                  }}
                >
                  Reset Filters
                </Button>
              )}
            </Box>

            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, alignSelf: "center" }}>
              Showing {filteredOffices.length} of {trackerData.offices?.length || 0} offices
            </Typography>
          </Box>

          {/* Main Table Card */}
          <Card sx={{ borderRadius: "8px", border: "1px solid #E2E8F0", mb: 3, boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
            <TableContainer component={Paper} sx={{ boxShadow: "none" }}>
              <Table sx={{ minWidth: 700 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#580000", "& .MuiTableCell-root": { py: 1.5, whiteSpace: "nowrap" } }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff", pl: 3, letterSpacing: "0.04em" }}>
                      OFFICE NAME
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff", letterSpacing: "0.04em" }}>
                      COMMITMENT STATUS
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff", letterSpacing: "0.04em" }}>
                      DATE SUBMITTED / LAST SAVED
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff", letterSpacing: "0.04em" }}>
                      SUBMITTED BY
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff", pr: 3, letterSpacing: "0.04em" }}>
                      ACTION
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                        <CircularProgress size={28} sx={{ color: "#580000" }} />
                        <Typography variant="body2" sx={{ color: "#64748B", mt: 1.5, fontWeight: 500 }}>
                          Loading office submission statuses...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredOffices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6, color: "text.secondary" }}>
                        {searchQuery || statusFilter !== "ALL"
                          ? "Try adjusting your search query or status filter."
                          : "No offices available for this evaluation period."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOffices.map((row) => {
                      const meta = OFFICE_METAS[row.office] || {
                        short: row.office?.slice(0, 4)?.toUpperCase() || "OFFC",
                        color: "#475569",
                        bg: "#F1F5F9",
                        border: "#CBD5E1",
                      };

                      const isLocked = row.status === "Submitted";
                      const isInProgress = row.status === "In Progress";
                      const isNotStarted = row.status === "Not Started";

                      return (
                        <TableRow
                          key={row.office}
                          hover
                          onClick={() => setSelectedOfficeForHistory(row.office)}
                          sx={{
                            cursor: "pointer",
                            borderLeft: `4px solid ${isLocked ? "#10B981" : isInProgress ? "#F59E0B" : "#CBD5E1"}`,
                            transition: "all 0.2s ease",
                            "&:hover": {
                              bgcolor: "rgba(248, 250, 252, 0.95)",
                              transform: "translateX(2px)",
                            },
                            "& .MuiTableCell-root": {
                              py: 2,
                              borderBottom: "1px solid #CBD5E1",
                              boxShadow: "inset 0 -1.5px 0 0 rgba(0, 0, 0, 0.02)",
                            },
                          }}
                        >
                          {/* Office Name Column */}
                          <TableCell sx={{ pl: 3 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                              <Box
                                sx={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: "6px",
                                  bgcolor: meta.bg,
                                  border: `1px solid ${meta.border}`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 800,
                                  fontSize: "0.75rem",
                                  color: meta.color,
                                  flexShrink: 0,
                                }}
                              >
                                {meta.short}
                              </Box>
                              <Box>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <Typography sx={{ fontWeight: 700, color: "#1E293B", fontSize: "0.875rem" }}>
                                    {row.office}
                                  </Typography>
                                  {row.versionNumber && (
                                    <Chip
                                      label={`V${row.versionNumber}`}
                                      size="small"
                                      sx={{
                                        height: 18,
                                        fontSize: "0.65rem",
                                        fontWeight: 700,
                                        bgcolor: "#F1F5F9",
                                        color: "#475569",
                                      }}
                                    />
                                  )}
                                </Box>
                              </Box>
                            </Box>
                          </TableCell>

                          {/* Commitment Status Badge Column */}
                          <TableCell>
                            {isLocked && (
                              <Chip
                                icon={<LockOutlinedIcon style={{ fontSize: 13, color: "#15803D" }} />}
                                label="Submitted (Locked)"
                                size="small"
                                sx={{
                                  bgcolor: "#DCFCE7",
                                  color: "#15803D",
                                  fontWeight: 700,
                                  fontSize: "0.75rem",
                                  border: "1px solid #BBF7D0",
                                }}
                              />
                            )}
                            {isInProgress && (
                              <Chip
                                icon={<AccessTimeIcon style={{ fontSize: 13, color: "#B45309" }} />}
                                label="In Progress (Draft)"
                                size="small"
                                sx={{
                                  bgcolor: "#FEF3C7",
                                  color: "#B45309",
                                  fontWeight: 700,
                                  fontSize: "0.75rem",
                                  border: "1px solid #FDE68A",
                                }}
                              />
                            )}
                            {isNotStarted && (
                              <Chip
                                icon={<BlockIcon style={{ fontSize: 13, color: "#64748B" }} />}
                                label="Not Started"
                                size="small"
                                sx={{
                                  bgcolor: "#F1F5F9",
                                  color: "#475569",
                                  fontWeight: 600,
                                  fontSize: "0.75rem",
                                  border: "1px solid #E2E8F0",
                                }}
                              />
                            )}
                          </TableCell>

                          {/* Date Submitted / Last Saved Column */}
                          <TableCell sx={{ fontSize: "0.85rem", color: "#475569" }}>
                            {formatDate(row.dateSubmittedOrSaved)}
                          </TableCell>

                          {/* Submitted By Column */}
                          <TableCell sx={{ fontSize: "0.85rem", color: "#475569" }}>
                            {row.submittedBy ? (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                <PersonIcon sx={{ fontSize: 16, color: "#94A3B8" }} />
                                <Typography sx={{ fontSize: "0.85rem", color: "#334155", fontWeight: 500 }}>
                                  {row.submittedBy}
                                </Typography>
                              </Box>
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          {/* Action Column */}
                          <TableCell align="right" sx={{ pr: 3 }}>
                            {row.commitmentId ? (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<VisibilityIcon fontSize="small" />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCommitmentId(row.commitmentId);
                                }}
                                sx={{
                                  textTransform: "none",
                                  fontWeight: 600,
                                  fontSize: "0.8125rem",
                                  borderColor: "#CBD5E1",
                                  color: "var(--maroon, #580000)",
                                  borderRadius: "9999px",
                                  py: 0.5,
                                  px: 2,
                                  "&:hover": {
                                    borderColor: "var(--maroon, #580000)",
                                    bgcolor: "rgba(88, 0, 0, 0.04)",
                                  },
                                }}
                              >
                                View Commitment
                              </Button>
                            ) : (
                              <Tooltip title="Click to view all commitment records across periods">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<FolderSharedOutlinedIcon fontSize="small" />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOfficeForHistory(row.office);
                                  }}
                                  sx={{
                                    textTransform: "none",
                                    fontWeight: 600,
                                    fontSize: "0.8125rem",
                                    borderColor: "#CBD5E1",
                                    color: "#475569",
                                    borderRadius: "9999px",
                                    py: 0.5,
                                    px: 2,
                                    "&:hover": {
                                      borderColor: "var(--maroon, #580000)",
                                      color: "var(--maroon, #580000)",
                                      bgcolor: "rgba(88, 0, 0, 0.04)",
                                    },
                                  }}
                                >
                                  View Records
                                </Button>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}
    </Box>
  );
}

function OfficeCommitmentsView({
  officeName,
  periods = [],
  onBack,
  onViewCommitment,
}) {
  const [loading, setLoading] = useState(false);
  const [commitments, setCommitments] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const meta = OFFICE_METAS[officeName] || {
    short: officeName?.slice(0, 4)?.toUpperCase() || "OFFC",
    color: "#580000",
    bg: "#FEF2F2",
    border: "#FECACA",
  };

  const getOfficeCode = (nameOrCode) => {
    if (!nameOrCode) return "";
    const s = String(nameOrCode).toUpperCase();
    if (s.includes("ACAD")) return "ACAD";
    if (s.includes("OSAS") || s.includes("STUDENT")) return "OSAS";
    if (s.includes("ADMIN")) return "ADMIN";
    return s;
  };

  useEffect(() => {
    if (!officeName) return;

    let mounted = true;
    const fetchOfficeRecords = async () => {
      try {
        setLoading(true);
        const res = await api.getCommitments({ limit: 100 });
        const list = res?.data ?? res ?? [];
        const targetCode = getOfficeCode(officeName);

        if (mounted) {
          const filtered = Array.isArray(list)
            ? list.filter((c) => getOfficeCode(c.office) === targetCode)
            : [];
          setCommitments(filtered);
        }
      } catch (err) {
        console.error("Failed to load office commitment history:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchOfficeRecords();
    return () => {
      mounted = false;
    };
  }, [officeName]);

  const getPeriodMeta = (periodId) => {
    const p = (periods || []).find((x) => String(x.id) === String(periodId));
    if (!p) return { name: "Unknown Period", dates: "", type: "" };
    const dates =
      p.start_date && p.end_date
        ? `${new Date(p.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(p.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : "";
    return { name: p.name || `${p.year} ${p.semester || ""}`, dates, type: p.type || "" };
  };

  const filtered = commitments.filter((c) => {
    const pMeta = getPeriodMeta(c.period_id);
    const q = search.toLowerCase().trim();

    if (statusFilter !== "ALL") {
      if (statusFilter === "Submitted" && c.status !== "Locked") return false;
      if (statusFilter === "Draft" && c.status !== "Draft" && c.status !== "In Progress") return false;
    }

    if (!q) return true;

    return (
      pMeta.name.toLowerCase().includes(q) ||
      (c.status || "").toLowerCase().includes(q) ||
      (c.submitted_by || "").toLowerCase().includes(q) ||
      (c.created_by || "").toLowerCase().includes(q)
    );
  });

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: "#F8FAFC", minHeight: "100vh" }}>
      {/* Page Header with sleek inline Back button */}
      <PageHeader
        breadcrumb={`Campus OPCR Tracker / ${officeName}`}
        title={
          <Button
            startIcon={<ArrowBackIcon sx={{ fontSize: "1.1rem" }} />}
            onClick={onBack}
            variant="text"
            size="small"
            sx={{
              color: "var(--maroon, #580000)",
              fontWeight: 600,
              textTransform: "none",
              fontSize: "0.95rem",
              py: 0.4,
              px: 0.5,
              minWidth: 0,
              borderRadius: "6px",
              letterSpacing: 0,
              "&:hover": {
                bgcolor: "rgba(88,0,0,0.07)",
                textDecoration: "none",
                color: "var(--maroon, #800000)",
              },
            }}
          >
            Back to Campus OPCR Tracker
          </Button>
        }
      />

      {/* Search & Filters Bar */}
      <Box sx={{ display: "flex", gap: { xs: 1.5, sm: 2 }, flexWrap: "wrap", alignItems: "flex-end", mb: 3, justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", gap: { xs: 1.5, sm: 2 }, flexWrap: "wrap", alignItems: "flex-end", width: { xs: "100%", md: "auto" } }}>
          {/* Search Field */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, width: { xs: "calc(50% - 6px)", sm: 300 } }}>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Search Period / Records
            </Typography>
            <TextField
              placeholder="Search..."
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94A3B8", fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                width: "100%",
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

          {/* Status Filter */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, width: { xs: "calc(50% - 6px)", sm: 160 } }}>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Status Filter
            </Typography>
            <FormControl size="small" sx={{ width: "100%" }}>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{
                  borderRadius: "6px",
                  backgroundColor: "#FFFFFF",
                  height: "38px",
                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                  fontWeight: 500,
                  "& fieldset": { borderColor: "#CBD5E1" },
                  "&:hover fieldset": { borderColor: "#94A3B8" },
                }}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="Submitted">Submitted (Locked)</MenuItem>
                <MenuItem value="Draft">In Progress (Draft)</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {(search || statusFilter !== "ALL") && (
            <Button
              variant="outlined"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
              sx={{
                height: "38px",
                textTransform: "none",
                borderColor: "#E2E8F0",
                color: "#475569",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: { xs: "0.78rem", sm: "0.875rem" },
                width: { xs: "100%", sm: "auto" },
                px: { xs: 1.5, sm: 2 },
                "&:hover": {
                  borderColor: "#CBD5E1",
                  backgroundColor: "#F8FAFC",
                },
              }}
            >
              Reset Filters
            </Button>
          )}
        </Box>

        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, alignSelf: "center" }}>
          Showing {filtered.length} of {commitments.length} records
        </Typography>
      </Box>

      {/* Records Table Card */}
      <Card sx={{ borderRadius: "8px", border: "1px solid #E2E8F0", mb: 3, boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
        <TableContainer component={Paper} sx={{ boxShadow: "none" }}>
          <Table sx={{ minWidth: 700 }}>
          <TableHead>
            <TableRow
              sx={{
                bgcolor: "#580000",
                "& .MuiTableCell-root": {
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  letterSpacing: "0.04em",
                  py: 1.5,
                  borderBottom: "none",
                },
              }}
            >
              <TableCell sx={{ pl: 3 }}>EVALUATION PERIOD</TableCell>
              <TableCell>OFFICE</TableCell>
              <TableCell>STATUS</TableCell>
              <TableCell>DATE SUBMITTED / LAST SAVED</TableCell>
              <TableCell>SUBMITTED BY</TableCell>
              <TableCell align="right" sx={{ pr: 3 }}>ACTION</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} sx={{ color: "#580000" }} />
                  <Typography variant="body2" sx={{ color: "#64748B", mt: 1.5, fontWeight: 500 }}>
                    Loading office commitment records...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: "#94A3B8" }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "#64748B" }}>
                    No commitment records found
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#94A3B8", mt: 0.5 }}>
                    {search || statusFilter !== "ALL"
                      ? "Try adjusting your search query or status filter."
                      : "This office has not initialized or submitted any OPCR commitments yet."}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => {
                const pMeta = getPeriodMeta(c.period_id);
                const isLocked = c.status === "Locked";
                const actor = c.submitted_by || c.created_by || "—";
                const updatedFmt = c.updated_at
                  ? new Date(c.updated_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—";

                return (
                  <TableRow
                    key={c.id}
                    hover
                    onClick={() => onViewCommitment(c.id)}
                    sx={{
                      cursor: "pointer",
                      borderLeft: `4px solid ${isLocked ? "#10B981" : "#F59E0B"}`,
                      transition: "all 0.15s ease",
                      "&:hover": { bgcolor: "#F8FAFC" },
                      "& .MuiTableCell-root": {
                        py: 2,
                        borderBottom: "1px solid #CBD5E1",
                        fontSize: "0.875rem",
                      },
                    }}
                  >
                    <TableCell sx={{ pl: 3 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                        <Typography sx={{ fontWeight: 700, color: "#1E293B", fontSize: "0.9rem" }}>
                          {pMeta.name}
                        </Typography>
                        {c.version_number && (
                          <Chip
                            label={`V${c.version_number}`}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              bgcolor: c.version_number > 1 ? "#EFF6FF" : "#F1F5F9",
                              color: c.version_number > 1 ? "#2563EB" : "#475569",
                            }}
                          />
                        )}
                        {pMeta.type && (
                          <Chip
                            label={pMeta.type}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              bgcolor: "#F1F5F9",
                              color: "#475569",
                            }}
                          />
                        )}
                      </Box>
                      {pMeta.dates && (
                        <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: 0.25 }}>
                          {pMeta.dates}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: "6px",
                            bgcolor: meta.bg,
                            border: `1px solid ${meta.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "0.7rem",
                            color: meta.color,
                            flexShrink: 0,
                          }}
                        >
                          {meta.short}
                        </Box>
                        <Typography sx={{ fontWeight: 600, color: "#1E293B", fontSize: "0.85rem" }}>
                          {officeName}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={isLocked ? "Submitted (Locked)" : "In Progress (Draft)"}
                        size="small"
                        icon={
                          isLocked ? (
                            <LockOutlinedIcon style={{ fontSize: 13, color: "#15803D" }} />
                          ) : (
                            <AccessTimeIcon style={{ fontSize: 13, color: "#B45309" }} />
                          )
                        }
                        sx={{
                          bgcolor: isLocked ? "#DCFCE7" : "#FEF3C7",
                          color: isLocked ? "#15803D" : "#B45309",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          border: isLocked ? "1px solid #BBF7D0" : "1px solid #FDE68A",
                        }}
                      />
                    </TableCell>

                    <TableCell sx={{ color: "#475569", fontSize: "0.85rem" }}>
                      {updatedFmt}
                    </TableCell>

                    <TableCell sx={{ color: "#334155", fontSize: "0.85rem" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <PersonIcon sx={{ fontSize: 16, color: "#94A3B8" }} />
                        <Typography sx={{ fontSize: "0.85rem", color: "#334155", fontWeight: 500 }}>
                          {actor}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell align="right" sx={{ pr: 3 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<VisibilityIcon fontSize="small" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewCommitment(c.id);
                        }}
                        sx={{
                          textTransform: "none",
                          fontWeight: 600,
                          fontSize: "0.8125rem",
                          borderColor: "#CBD5E1",
                          color: "var(--maroon, #580000)",
                          borderRadius: "9999px",
                          py: 0.5,
                          px: 2,
                          "&:hover": {
                            borderColor: "var(--maroon, #580000)",
                            bgcolor: "rgba(88, 0, 0, 0.04)",
                          },
                        }}
                      >
                        View Commitment
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  </Box>
);
}
