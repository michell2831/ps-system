import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
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
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Pagination,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import RefreshIcon from "@mui/icons-material/Refresh";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import BlockIcon from "@mui/icons-material/Block";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DateRangeIcon from "@mui/icons-material/DateRange";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import PageHeader from "../components/PageHeader";
import KPIModal from "../modals/KPIModal";
import ResultModal from "../modals/ResultModal";
import { useAppStore } from "../store/useAppStore";
import { api } from "../services/api";

const OFFICE_METAS = {
  "Campus Academic Office": {
    short: "ACAD",
    color: "#B45309",
    bg: "#FFFBEB",
    border: "#FDE68A",
    accent: "#D97706",
  },
  "Campus Student Services and Affairs Office": {
    short: "OSAS",
    color: "#1E40AF",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    accent: "#2563EB",
  },
  "Campus Administrative Office": {
    short: "ADMIN",
    color: "#065F46",
    bg: "#ECFDF5",
    border: "#A7F3D0",
    accent: "#10B981",
  },
  "Office of Student Services": {
    short: "OSS",
    color: "#7E22CE",
    bg: "#FDF4FF",
    border: "#E9D5FF",
    accent: "#A855F7",
  },
};

const CATEGORY_MAP = {
  CUSTOMER: { label: "Timeliness", color: "#2563EB", bg: "#EFF6FF", border: "rgba(37, 99, 235, 0.15)" },
  COMPLIANCE: { label: "Quality", color: "#D97706", bg: "#FFFBEB", border: "rgba(217, 119, 6, 0.15)" },
  EFFICIENCY: { label: "Efficiency", color: "#10B981", bg: "#ECFDF5", border: "rgba(16, 185, 129, 0.15)" },
  Timeliness: { label: "Timeliness", color: "#2563EB", bg: "#EFF6FF", border: "rgba(37, 99, 235, 0.15)" },
  Quality: { label: "Quality", color: "#D97706", bg: "#FFFBEB", border: "rgba(217, 119, 6, 0.15)" },
  Efficiency: { label: "Efficiency", color: "#10B981", bg: "#ECFDF5", border: "rgba(16, 185, 129, 0.15)" },
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch (_) {
    return dateStr;
  }
}

function formatKpiUnit(val, unit) {
  if (!unit) return "";
  const num = Number(val);
  const u = String(unit).trim().toUpperCase();
  if (u === "DAYS" || u === "DAY") {
    return num === 1 ? "DAY" : "DAYS";
  }
  if (u === "HOURS" || u === "HOUR") {
    return num === 1 ? "HOUR" : "HOURS";
  }
  if (u === "MINUTES" || u === "MIN" || u === "MINUTE") {
    return num === 1 ? "MINUTE" : "MINUTES";
  }
  if (u === "PERCENT" || u === "%") {
    return "PERCENT";
  }
  return unit;
}

function ExpandableText({ text, maxLines = 2 }) {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    const checkOverflow = () => {
      const el = textRef.current;
      if (el) {
        // A full line is ~19px. A difference of > 6px guarantees there is an actual truncated line.
        const hasOverflow = el.scrollHeight - el.clientHeight > 6;
        setIsClamped(hasOverflow);
      }
    };

    const rafId = requestAnimationFrame(checkOverflow);
    window.addEventListener("resize", checkOverflow);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [text]);

  if (!text) return <Typography color="text.disabled">—</Typography>;

  return (
    <Box sx={{ display: "inline-block", maxWidth: 360 }}>
      <Typography
        ref={textRef}
        component="span"
        sx={{
          fontWeight: 500,
          fontSize: "0.875rem",
          lineHeight: 1.35,
          color: "text.primary",
          ...(!expanded
            ? {
              display: "-webkit-box",
              WebkitLineClamp: maxLines,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }
            : {
              display: "inline",
            }),
        }}
      >
        {text}
      </Typography>
      {(isClamped || expanded) && (
        <Typography
          component="span"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          sx={{
            display: "inline-block",
            ml: 0.75,
            color: "#2563EB",
            fontWeight: 600,
            fontSize: "0.75rem",
            cursor: "pointer",
            userSelect: "none",
            "&:hover": {
              textDecoration: "underline",
              color: "#1D4ED8",
            },
          }}
        >
          {expanded ? "Show less" : "Show more"}
        </Typography>
      )}
    </Box>
  );
}

export default function PlanningHub({ onNavigate }) {
  const { permissions, services, fetchServices } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hubData, setHubData] = useState({
    officeCards: [],
    kpiStandards: [],
    evaluationPeriods: [],
  });

  // KPI Table Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOffice, setSelectedOffice] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Edit KPI modal state
  const [editingKpi, setEditingKpi] = useState(null);
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
  const [kpiName, setKpiName] = useState("");
  const [kpiCategory, setKpiCategory] = useState("Timeliness");
  const [kpiTarget, setKpiTarget] = useState("");
  const [kpiTargetDays, setKpiTargetDays] = useState("");
  const [kpiTargetHours, setKpiTargetHours] = useState("");
  const [kpiTargetMins, setKpiTargetMins] = useState("");
  const [kpiUnit, setKpiUnit] = useState("Days");
  const [kpiServiceId, setKpiServiceId] = useState("");
  const [kpiErrors, setKpiErrors] = useState({});
  const [isSavingKpi, setIsSavingKpi] = useState(false);

  // Result modal state
  const [resultModal, setResultModal] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  const loadHubData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPlanningHubSummary();
      if (data) {
        setHubData(data);
      }
    } catch (err) {
      console.error("Failed to load Planning Hub summary:", err);
      setError(err.message || "Failed to load Planning Configuration Hub data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHubData();
    if (!services || services.length === 0) {
      fetchServices();
    }
  }, []);

  // Map service ID to Service Name
  const serviceMap = useMemo(() => {
    const map = {};
    if (services && Array.isArray(services)) {
      services.forEach((s) => {
        map[s.id] = s.name;
      });
    }
    return map;
  }, [services]);

  // Handle Edit KPI button click
  const handleOpenEditKpi = (kpi) => {
    setEditingKpi(kpi);
    setKpiName(kpi.name || "");

    // Normalize category
    let cat = kpi.category || "Timeliness";
    if (cat === "CUSTOMER") cat = "Timeliness";
    if (cat === "COMPLIANCE") cat = "Quality";
    if (cat === "EFFICIENCY") cat = "Efficiency";
    setKpiCategory(cat);

    const val = Number(kpi.target_value) || 0;
    setKpiTarget(val);

    const isDuration = (cat === "Timeliness" || cat === "Efficiency") && (kpi.unit === "DAYS" || kpi.unit === "Days" || kpi.unit === "MINUTES");
    if (isDuration) {
      let totalMins = val;
      if (kpi.unit === "DAYS" || kpi.unit === "Days") {
        totalMins = val * 1440;
      }
      const d = Math.floor(totalMins / 1440);
      const h = Math.floor((totalMins % 1440) / 60);
      const m = Math.round(totalMins % 60);
      setKpiTargetDays(d || "");
      setKpiTargetHours(h || "");
      setKpiTargetMins(m || "");
    } else {
      setKpiTargetDays("");
      setKpiTargetHours("");
      setKpiTargetMins("");
    }

    setKpiUnit(kpi.unit || "Days");
    setKpiServiceId(kpi.service_id || "");
    setKpiErrors({});
    setIsKpiModalOpen(true);
  };

  const handleCloseKpiModal = () => {
    setIsKpiModalOpen(false);
    setEditingKpi(null);
  };

  const handleSaveKpi = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const err = {};
    if (!kpiName.trim()) {
      err.name = "KPI Name is required.";
    }
    if (!kpiUnit || !kpiUnit.trim()) {
      err.unit = "Unit is required.";
    }
    if (!kpiServiceId) {
      err.serviceId = "Please link a Service.";
    }

    const isTimeDuration = (kpiCategory === "Timeliness" || kpiCategory === "Efficiency") && kpiUnit !== "/ 5" && kpiUnit !== "PERCENT";
    if (isTimeDuration) {
      const dStr = kpiTargetDays.toString().trim();
      const hStr = kpiTargetHours.toString().trim();
      const mStr = kpiTargetMins.toString().trim();
      if (!dStr && !hStr && !mStr) {
        err.target = "At least one target duration (Days, Hours, or Minutes) is required.";
      }
    } else {
      if (kpiTarget === "" || isNaN(Number(kpiTarget))) {
        err.target = "Target value is required.";
      }
    }

    if (Object.keys(err).length > 0) {
      setKpiErrors(err);
      return;
    }

    try {
      setIsSavingKpi(true);
      let targetVal = Number(kpiTarget) || 0;
      if (isTimeDuration) {
        const totalMinutes =
          (Number(kpiTargetDays) || 0) * 1440 +
          (Number(kpiTargetHours) || 0) * 60 +
          (Number(kpiTargetMins) || 0);
        targetVal = (kpiUnit === "DAYS" || kpiUnit === "Days") ? (totalMinutes / 1440) : totalMinutes;
      }

      const payload = {
        name: kpiName.trim(),
        category: kpiCategory,
        target_value: targetVal,
        unit: kpiUnit,
        service_id: kpiServiceId,
      };

      await api.updateKpi(editingKpi.id, payload);

      setResultModal({
        show: true,
        type: "success",
        title: "KPI Standard Updated",
        message: `Successfully updated KPI standard "${kpiName}".`,
      });
      setIsKpiModalOpen(false);
      setEditingKpi(null);
      await loadHubData();
    } catch (saveErr) {
      console.error("Failed to update KPI:", saveErr);
      setKpiErrors({ general: saveErr.message || "Failed to update KPI." });
    } finally {
      setIsSavingKpi(false);
    }
  };

  // 403 Forbidden Access Guard (AC1)
  if (!permissions?.canSeePlanningHub) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: "#F8FAFC", minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <Paper
          elevation={0}
          sx={{
            maxWidth: 540,
            width: "100%",
            p: 4,
            textAlign: "center",
            border: "1px solid #FECACA",
            borderRadius: "8px",
            backgroundColor: "#FEF2F2",
          }}
        >
          <WarningAmberIcon sx={{ fontSize: 64, color: "#DC2626", mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#991B1B", mb: 1 }}>
            403 — Access Denied
          </Typography>
          <Typography variant="body1" sx={{ color: "#7F1D1D", mb: 3 }}>
            The Planning Configuration Hub is restricted strictly to the <strong>Planning Officer</strong> role.
            Your current role does not have permission to view campus-wide planning configurations.
          </Typography>
          <Button
            variant="contained"
            onClick={() => onNavigate && onNavigate("dashboard")}
            sx={{
              backgroundColor: "#580000",
              "&:hover": { backgroundColor: "#3b0000" },
              borderRadius: "6px",
              textTransform: "none",
              fontWeight: 700,
              px: 3,
            }}
          >
            Return to Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }

  // Filtered KPIs
  const filteredKpis = useMemo(() => {
    let list = hubData.kpiStandards || [];

    if (selectedOffice !== "ALL") {
      list = list.filter((k) => k.office === selectedOffice);
    }

    if (selectedCategory !== "ALL") {
      list = list.filter((k) => {
        let cat = k.category;
        if (cat === "CUSTOMER") cat = "Timeliness";
        if (cat === "COMPLIANCE") cat = "Quality";
        if (cat === "EFFICIENCY") cat = "Efficiency";
        return cat === selectedCategory;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((k) => {
        if (!k) return false;
        const kpiName = (k.name || k.title || "").toLowerCase();
        const svcName = (serviceMap[k.service_id] || "").toLowerCase();
        const officeName = (k.office || "").toLowerCase();
        return kpiName.includes(q) || svcName.includes(q) || officeName.includes(q);
      });
    }

    return list;
  }, [hubData.kpiStandards, selectedOffice, selectedCategory, searchQuery, serviceMap]);

  const totalPages = Math.ceil(filteredKpis.length / rowsPerPage) || 1;
  const paginatedKpis = filteredKpis.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Find period date range helper
  const getPeriodDateRange = (periodName) => {
    if (!periodName || !hubData.evaluationPeriods) return null;
    const match = hubData.evaluationPeriods.find((p) => p.name === periodName);
    if (match && match.start_date && match.end_date) {
      return `${formatDate(match.start_date)} — ${formatDate(match.end_date)}`;
    }
    return null;
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: "#F8FAFC", minHeight: "100vh", fontFamily: '"DM Sans", sans-serif' }}>
      {/* Page Header */}
      <PageHeader
        breadcrumb="Planning Configuration / Campus-Wide Hub"
        title="Planning Configuration Hub"
        subtitle="Centralized governance dashboard for overseeing all campus offices' KPI standards and evaluation periods."
        action={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadHubData}
            disabled={loading}
            sx={{
              borderColor: "#E2E8F0",
              color: "#334155",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.875rem",
              borderRadius: "6px",
              backgroundColor: "#FFFFFF",
              "&:hover": { borderColor: "#CBD5E1", backgroundColor: "#F8FAFC" },
            }}
          >
            Refresh Hub
          </Button>
        }
      />

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8, flexDirection: "column", gap: 2 }}>
          <CircularProgress sx={{ color: "#580000" }} />
          <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 500 }}>
            Aggregating planning configurations across all offices...
          </Typography>
        </Box>
      )}

      {error && !loading && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: "8px" }} action={
          <Button color="inherit" size="small" onClick={loadHubData}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
          {/* ══════════════════════════════════════════════════════════════════
              SECTION 1: OFFICES OVERVIEW CARDS
          ══════════════════════════════════════════════════════════════════ */}
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
                  Offices Overview
                </Typography>
                <Typography sx={{ fontSize: 12, color: "#64748B", fontWeight: 500, mt: 0.25 }}>
                  Active periods, submission commitments, and operational counts per campus office
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {hubData.officeCards.length} Campus Offices Registered
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
                gap: { xs: 1.5, sm: 2, md: 2.5 },
                alignItems: "stretch",
              }}
            >
              {hubData.officeCards.map((card, idx) => {
                const meta = OFFICE_METAS[card.office] || {
                  short: card.office.slice(0, 4).toUpperCase(),
                  color: "#475569",
                  bg: "#F8FAFC",
                  border: "#E2E8F0",
                  accent: "#64748B",
                };

                const dateRange = getPeriodDateRange(card.activePeriod);
                const status = card.commitmentStatus || "Not Started";

                let statusBadge = {
                  bg: "#F1F5F9",
                  color: "#475569",
                  border: "rgba(100, 116, 139, 0.15)",
                  icon: <BlockIcon style={{ fontSize: 12, color: "#64748B", marginRight: 3 }} />,
                };
                if (status === "Locked" || status === "Submitted") {
                  statusBadge = {
                    bg: "#DCFCE7",
                    color: "#15803D",
                    border: "rgba(21, 128, 61, 0.2)",
                    icon: <LockOutlinedIcon style={{ fontSize: 12, color: "#15803D", marginRight: 3 }} />,
                  };
                } else if (status === "Draft" || status === "In Progress" || status === "Revision Requested") {
                  statusBadge = {
                    bg: "#FEF3C7",
                    color: "#B45309",
                    border: "rgba(180, 83, 9, 0.2)",
                    icon: <AccessTimeIcon style={{ fontSize: 12, color: "#B45309", marginRight: 3 }} />,
                  };
                }

                return (
                  <Box
                    key={card.office || idx}
                    sx={{
                      bgcolor: "#FFFFFF",
                      borderRadius: "8px",
                      border: "1px solid #E2E8F0",
                      p: { xs: "12px 10px", sm: "16px 16px", md: "20px 22px" },
                      pt: { xs: "14px", sm: "18px", md: "22px" },
                      height: "100%",
                      width: "100%",
                      minHeight: { xs: 215, sm: 220, md: 225 },
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
                    {/* Top Accent Color Line */}
                    <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", bgcolor: meta.accent }} />

                    {/* Header: Office Short Tag + Commitment Status */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, height: 22 }}>
                      <Chip
                        label={meta.short}
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: { xs: "0.62rem", sm: "0.72rem" },
                          backgroundColor: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.border}`,
                          height: { xs: 20, sm: 22 },
                        }}
                      />
                      <Chip
                        icon={statusBadge.icon}
                        label={status}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: { xs: "0.6rem", sm: "0.7rem" },
                          backgroundColor: statusBadge.bg,
                          color: statusBadge.color,
                          border: `1px solid ${statusBadge.border}`,
                          height: { xs: 20, sm: 22 },
                          "& .MuiChip-icon": { ml: 0.25 },
                        }}
                      />
                    </Box>

                    {/* Office Name - Normalized 2-line height */}
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: "#0F172A",
                        fontSize: { xs: "0.8rem", sm: "0.88rem", md: "0.95rem" },
                        lineHeight: 1.25,
                        mb: 1,
                        height: { xs: 34, sm: 38, md: 42 },
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {card.office}
                    </Typography>

                    {/* Active Period Box - Normalized height */}
                    <Box
                      sx={{
                        p: { xs: "6px 8px", sm: "8px 10px" },
                        borderRadius: "6px",
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #F1F5F9",
                        mb: { xs: 1, sm: 1.5 },
                        height: { xs: 48, sm: 52 },
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        boxSizing: "border-box",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <DateRangeIcon sx={{ fontSize: { xs: 12, sm: 14 }, color: "#64748B" }} />
                        <Typography sx={{ fontWeight: 600, color: "#1E293B", fontSize: { xs: "0.72rem", sm: "0.8rem" } }}>
                          {card.activePeriod || "No Period"}
                        </Typography>
                      </Box>
                      <Typography sx={{ color: "#64748B", fontSize: { xs: "0.62rem", sm: "0.72rem" }, ml: { xs: 2, sm: 2.5 }, mt: 0.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {dateRange || "Period window active"}
                      </Typography>
                    </Box>

                    <Divider sx={{ borderColor: "#F1F5F9", mb: { xs: 1, sm: 1.5 } }} />

                    {/* 2-Column Counters Row Container */}
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: { xs: 0.75, sm: 1.25 } }}>
                      <Box sx={{ textAlign: "center", p: { xs: 0.75, sm: 1.25 }, bgcolor: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                        <Typography sx={{ fontSize: { xs: "0.58rem", sm: "0.68rem" }, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                          Active KPIs
                        </Typography>
                        <Typography sx={{ fontSize: { xs: "1.1rem", sm: "1.35rem" }, fontWeight: 800, color: meta.color, mt: 0.25, lineHeight: 1 }}>
                          {card.activeKpiCount}
                        </Typography>
                      </Box>

                      <Box sx={{ textAlign: "center", p: { xs: 0.75, sm: 1.25 }, bgcolor: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                        <Typography sx={{ fontSize: { xs: "0.58rem", sm: "0.68rem" }, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                          Active Services
                        </Typography>
                        <Typography sx={{ fontSize: { xs: "1.1rem", sm: "1.35rem" }, fontWeight: 800, color: "#0F172A", mt: 0.25, lineHeight: 1 }}>
                          {card.activeServiceCount}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* ══════════════════════════════════════════════════════════════════
              SECTION 2: CAMPUS KPI STANDARDS TABLE
          ══════════════════════════════════════════════════════════════════ */}
          <Box>
            <Card
              elevation={0}
              sx={{
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
                bgcolor: "#FFFFFF",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                p: 3,
                mb: 3,
              }}
            >
              {/* Header & Subtitle */}
              <Box sx={{ mb: 2.5 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
                  Campus KPI Standards
                </Typography>
                <Typography sx={{ fontSize: 12, color: "#64748B", fontWeight: 500, mt: 0.25 }}>
                  Aggregated performance targets across all campus offices with cross-office write governance
                </Typography>
              </Box>

              {/* Filters Bar */}
              <Box sx={{ display: "flex", gap: { xs: 1.5, sm: 2 }, flexWrap: "wrap", alignItems: "flex-end", mb: 3 }}>
                {/* Search */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, width: { xs: "100%", sm: 240 } }}>
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Search KPI or Service
                  </Typography>
                  <TextField
                    placeholder="Search..."
                    size="small"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
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
                      width: "100%",
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "8px",
                        backgroundColor: "#FFFFFF",
                        height: "40px",
                        fontSize: "0.875rem",
                        color: "#1E293B",
                        "& fieldset": { borderColor: "#CBD5E1" },
                        "&:hover fieldset": { borderColor: "#94A3B8" },
                        "&.Mui-focused fieldset": { borderColor: "#64748B", borderWidth: "1px" },
                      },
                    }}
                  />
                </Box>

                {/* Office Filter */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, width: { xs: "calc(50% - 6px)", sm: 180, md: 200 } }}>
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Office
                  </Typography>
                  <TextField
                    select
                    size="small"
                    value={selectedOffice}
                    onChange={(e) => {
                      setSelectedOffice(e.target.value);
                      setCurrentPage(1);
                    }}
                    SelectProps={{ displayEmpty: true }}
                    sx={{
                      width: "100%",
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "8px",
                        backgroundColor: "#FFFFFF",
                        height: "40px",
                        fontSize: "0.875rem",
                        color: "#1E293B",
                        "& fieldset": { borderColor: "#CBD5E1" },
                        "&:hover fieldset": { borderColor: "#94A3B8" },
                        "&.Mui-focused fieldset": { borderColor: "#64748B", borderWidth: "1px" },
                      },
                    }}
                  >
                    <MenuItem value="ALL">All Offices</MenuItem>
                    {hubData.officeCards.map((c) => (
                      <MenuItem key={c.office} value={c.office}>
                        {c.office}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                {/* Category Filter */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, width: { xs: "calc(50% - 6px)", sm: 160, md: 180 } }}>
                  <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Category
                  </Typography>
                  <TextField
                    select
                    size="small"
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                    SelectProps={{ displayEmpty: true }}
                    sx={{
                      width: "100%",
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "8px",
                        backgroundColor: "#FFFFFF",
                        height: "40px",
                        fontSize: "0.875rem",
                        color: "#1E293B",
                        "& fieldset": { borderColor: "#CBD5E1" },
                        "&:hover fieldset": { borderColor: "#94A3B8" },
                        "&.Mui-focused fieldset": { borderColor: "#64748B", borderWidth: "1px" },
                      },
                    }}
                  >
                    <MenuItem value="ALL">All Categories</MenuItem>
                    <MenuItem value="Timeliness">Timeliness</MenuItem>
                    <MenuItem value="Quality">Quality</MenuItem>
                    <MenuItem value="Efficiency">Efficiency</MenuItem>
                  </TextField>
                </Box>

                {/* Reset Filters Button */}
                {(searchQuery || selectedOffice !== "ALL" || selectedCategory !== "ALL") && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedOffice("ALL");
                      setSelectedCategory("ALL");
                      setCurrentPage(1);
                    }}
                    sx={{
                      height: "40px",
                      width: { xs: "100%", sm: "auto" },
                      textTransform: "none",
                      borderColor: "#E2E8F0",
                      color: "#475569",
                      borderRadius: "8px",
                      fontWeight: 600,
                      fontSize: "0.875rem",
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

              {/* Table Container */}
              <TableContainer component={Paper} sx={{ borderRadius: "8px", border: "1px solid #E2E8F0", mb: 2, boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#580000", "& .MuiTableCell-root": { py: 1.5, whiteSpace: "nowrap" } }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff", width: 100 }}>OFFICE</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff" }}>SERVICE NAME</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff" }}>KPI NAME</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff" }}>CATEGORY</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff" }}>TARGET VALUE</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff", width: 120 }}>ACTIONS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedKpis.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                            No KPI standards match your active filter criteria.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedKpis.map((kpi) => {
                        const meta = OFFICE_METAS[kpi.office] || {
                          short: kpi.office ? kpi.office.slice(0, 4) : "—",
                          color: "#475569",
                          bg: "#F8FAFC",
                          border: "#E2E8F0",
                        };

                        const catInfo = CATEGORY_MAP[kpi.category] || {
                          label: kpi.category || "Standard",
                          color: "#475569",
                          bg: "#F1F5F9",
                          border: "rgba(100, 116, 139, 0.15)",
                        };

                        const svcName = serviceMap[kpi.service_id] || (kpi.service_id ? `Service (${kpi.service_id.slice(0, 8)}...)` : "Campus Standard");

                        return (
                          <TableRow
                            key={kpi.id}
                            hover
                            sx={{
                              "& .MuiTableCell-root": {
                                py: 1.5,
                                borderBottom: "1px solid #CBD5E1",
                                boxShadow: "inset 0 -1.5px 0 0 rgba(0, 0, 0, 0.04)",
                              },
                            }}
                          >
                            <TableCell>
                              <Chip
                                label={meta.short}
                                size="small"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: "0.7rem",
                                  backgroundColor: meta.bg,
                                  color: meta.color,
                                  border: `1px solid ${meta.border}`,
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, color: "#1E293B", minWidth: 220, maxWidth: 360 }}>
                              <ExpandableText text={svcName} />
                            </TableCell>
                            <TableCell sx={{ color: "#334155", fontWeight: 500, fontSize: "0.85rem", minWidth: 200, maxWidth: 320 }}>
                              <ExpandableText text={kpi.name} />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={catInfo.label}
                                size="small"
                                sx={{
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  backgroundColor: catInfo.bg,
                                  color: catInfo.color,
                                  border: `1px solid ${catInfo.border}`,
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, color: "#0F172A", fontSize: "0.875rem" }}>
                              {Number(kpi.target_value).toFixed(Number(kpi.target_value) % 1 === 0 ? 0 : 2)}{" "}
                              <Box component="span" sx={{ color: "#64748B", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, ml: 0.5 }}>
                                {formatKpiUnit(kpi.target_value, kpi.unit)}
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Tooltip title="Edit KPI Standard">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                                  onClick={() => handleOpenEditKpi(kpi)}
                                  sx={{
                                    textTransform: "none",
                                    fontWeight: 600,
                                    fontSize: "0.75rem",
                                    py: 0.35,
                                    px: 1.25,
                                    borderRadius: "4px",
                                    borderColor: "#E2E8F0",
                                    color: "#580000",
                                    "&:hover": {
                                      borderColor: "#580000",
                                      backgroundColor: "rgba(88, 0, 0, 0.04)",
                                    },
                                  }}
                                >
                                  Edit
                                </Button>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, flexWrap: "wrap", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">Items per page:</Typography>
                  <Select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    size="small"
                    sx={{
                      height: 32,
                      "& .MuiSelect-select": { py: 0.5, px: 1.5, fontSize: "0.875rem" },
                      borderRadius: "6px",
                    }}
                  >
                    <MenuItem value={5}>5</MenuItem>
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                  </Select>
                </Box>
                {totalPages > 1 && (
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={(e, val) => setCurrentPage(val)}
                    color="primary"
                    shape="rounded"
                  />
                )}
              </Box>
            </Card>
          </Box>

          {/* ══════════════════════════════════════════════════════════════════
              SECTION 3: EVALUATION PERIODS SUMMARY
          ══════════════════════════════════════════════════════════════════ */}
          <Box>
            <Card
              elevation={0}
              sx={{
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
                bgcolor: "#FFFFFF",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                p: 3,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5, flexWrap: "wrap", gap: 1.5 }}>
                <Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
                    Evaluation Periods Summary
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#64748B", fontWeight: 500, mt: 0.25 }}>
                    Status badges, date windows, and cycle governance across campus
                  </Typography>
                </Box>

                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<ArrowForwardIcon sx={{ fontSize: 15 }} />}
                  onClick={() => onNavigate && onNavigate("evaluationPeriods")}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    borderRadius: "6px",
                    borderColor: "#CBD5E1",
                    color: "#334155",
                    bgcolor: "#FFFFFF",
                    "&:hover": { borderColor: "#580000", color: "#580000", backgroundColor: "#F8FAFC" },
                  }}
                >
                  Manage Periods
                </Button>
              </Box>

              {/* Periods table */}
              <TableContainer component={Paper} sx={{ borderRadius: "8px", border: "1px solid #E2E8F0", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#580000", "& .MuiTableCell-root": { py: 1.5, whiteSpace: "nowrap" } }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff" }}>PERIOD NAME</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff" }}>SCOPE</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff" }}>START DATE</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff" }}>END DATE</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff" }}>STATUS</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.75rem", color: "#ffffff", width: 120 }}>ACTION</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {hubData.evaluationPeriods?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                          No evaluation periods registered.
                        </TableCell>
                      </TableRow>
                    ) : (
                      hubData.evaluationPeriods?.map((p) => {
                        const isActive = p.status === "Active" || p.status === "Open" || p.is_active;
                        const isQueued = p.status === "Queued";

                        return (
                          <TableRow
                            key={p.id}
                            hover
                            sx={{
                              opacity: isActive ? 1 : 0.75,
                              "& .MuiTableCell-root": {
                                py: 1.5,
                                borderBottom: "1px solid #CBD5E1",
                                boxShadow: "inset 0 -1.5px 0 0 rgba(0, 0, 0, 0.04)",
                              },
                            }}
                          >
                            <TableCell sx={{ fontWeight: 700, color: "#1E293B", fontSize: "0.875rem" }}>
                              {p.name}
                              {p.warning_level === "overdue" && (
                                <Tooltip title={p.warning_message || "Overdue Period"}>
                                  <WarningAmberIcon
                                    sx={{ fontSize: 15, color: "#DC2626", verticalAlign: "middle", ml: 0.75 }}
                                  />
                                </Tooltip>
                              )}
                            </TableCell>
                            <TableCell sx={{ color: "#475569", fontSize: "0.82rem", fontWeight: 500 }}>
                              {p.office === "ALL" ? "Campus-Wide" : (p.office || "Campus-Wide")}
                            </TableCell>
                            <TableCell sx={{ color: "#334155", fontSize: "0.82rem", fontWeight: 500 }}>
                              {formatDate(p.start_date)}
                            </TableCell>
                            <TableCell sx={{ color: "#334155", fontSize: "0.82rem", fontWeight: 500 }}>
                              {formatDate(p.end_date)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={p.status === "Open" ? "Active" : p.status}
                                size="small"
                                sx={{
                                  bgcolor: isActive ? "#ECFDF5" : (isQueued ? "#FFFBEB" : "#F1F5F9"),
                                  color: isActive ? "#059669" : (isQueued ? "#D97706" : "#64748B"),
                                  border: isActive
                                    ? "1px solid rgba(5, 150, 105, 0.2)"
                                    : (isQueued ? "1px solid rgba(217, 119, 6, 0.2)" : "1px solid rgba(100, 116, 139, 0.15)"),
                                  fontWeight: 700,
                                  fontSize: "0.72rem",
                                }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => onNavigate && onNavigate("evaluationPeriods")}
                                sx={{
                                  textTransform: "none",
                                  fontWeight: 700,
                                  fontSize: "0.75rem",
                                  color: "#580000",
                                  py: 0.25,
                                  "&:hover": { backgroundColor: "rgba(88, 0, 0, 0.04)" },
                                }}
                              >
                                Edit
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
        </Box>
      )}

      {/* KPI Edit Modal */}
      <KPIModal
        open={isKpiModalOpen}
        editingKpi={editingKpi}
        services={services || []}
        name={kpiName}
        setName={setKpiName}
        category={kpiCategory}
        setCategory={setKpiCategory}
        target={kpiTarget}
        setTarget={setKpiTarget}
        targetDays={kpiTargetDays}
        setTargetDays={setKpiTargetDays}
        targetHours={kpiTargetHours}
        setTargetHours={setKpiTargetHours}
        targetMins={kpiTargetMins}
        setTargetMins={setKpiTargetMins}
        unit={kpiUnit}
        setUnit={setKpiUnit}
        serviceId={kpiServiceId}
        setServiceId={setKpiServiceId}
        errors={kpiErrors}
        setErrors={setKpiErrors}
        onSave={handleSaveKpi}
        onClose={handleCloseKpiModal}
      />

      {/* Result Modal for feedback */}
      {resultModal.show && (
        <ResultModal
          type={resultModal.type}
          title={resultModal.title}
          message={resultModal.message}
          onClose={() => setResultModal({ ...resultModal, show: false })}
        />
      )}
    </Box>
  );
}

