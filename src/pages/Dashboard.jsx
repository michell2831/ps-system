import { useEffect, useState, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  Chip,
  Alert,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Paper,
  InputAdornment,
  FormControl,
  Select,
  Button,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import {
  CalendarToday as CalendarIcon,
  DateRange as DateRangeIcon,
  Layers as LayersIcon,
  Rule as RuleIcon,
  Lock as LockIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  CalendarMonth as CalendarMonthIcon,
  Search as SearchIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  Business as BusinessIcon,
  Speed as SpeedIcon,
  InfoOutlined as InfoIcon,
} from "@mui/icons-material";
import PageHeader from "../components/PageHeader";
import { useAppStore } from "../store/useAppStore";
import { api } from "../services/api";
import { normalizeOffice } from "../services/permissions";

const getArtaClassification = (svc) => {
  if (!svc) return "Simple";
  const cls = (svc.classification || "").toLowerCase();
  if (cls.includes("technical")) return "Highly Technical";
  if (cls.includes("complex")) return "Complex";
  if (cls.includes("simple")) return "Simple";

  let days = 0;
  if (svc.sla_target_unit === "Days") {
    days = svc.sla_target_value;
  } else if (svc.sla_target_unit === "Minutes") {
    days = svc.sla_target_value / 1440;
  } else if (svc.sla_target_unit === "Hours") {
    days = svc.sla_target_value / 24;
  }
  if (days > 7) return "Highly Technical";
  if (days > 3) return "Complex";
  return "Simple";
};

const getOfficeBadge = (rawOffice) => {
  if (!rawOffice) return { label: '—', bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' };
  const lower = rawOffice.toLowerCase();
  if (lower.includes('acad')) {
    return { label: 'ACAD', full: 'Academic Affairs Office', bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' };
  }
  if (lower.includes('student') || lower.includes('osas')) {
    return { label: 'OSAS', full: 'Student Affairs Office (OSAS)', bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' };
  }
  if (lower.includes('admin')) {
    return { label: 'ADMIN', full: 'Administration Office', bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' };
  }
  return { label: rawOffice, full: rawOffice, bg: '#FDF4FF', text: '#7E22CE', border: '#E9D5FF' };
};

// ── Design tokens (matching theme.js + colors.js) ──────────────────────────
const T = {
  maroon: "#580000",
  maroonLight: "#800000",
  blue: "#2563EB",
  emerald: "#10B981",
  amber: "#F59E0B",
  purple: "#8B5CF6",
  slate50: "#F8FAFC",
  slate100: "#F1F5F9",
  slate200: "#E2E8F0",
  slate300: "#CBD5E1",
  slate400: "#94A3B8",
  slate600: "#475569",
  slate900: "#0F172A",
  white: "#FFFFFF",
};

// ── Small reusable atoms ────────────────────────────────────────────────────
function StatCard({ accentColor, children }) {
  return (
    <Box
      sx={{
        bgcolor: T.white,
        borderRadius: "8px",
        border: `1px solid ${T.slate200}`,
        p: "20px 24px",
        pt: "22px",
        minHeight: 130,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.2s ease",
        "&:hover": { transform: "translateY(-2px)", boxShadow: "0 6px 16px rgba(0,0,0,0.07)" },
      }}
    >
      <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", bgcolor: accentColor }} />
      {children}
    </Box>
  );
}

function StatLabel({ children }) {
  return (
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 700,
        color: T.slate400,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {children}
    </Typography>
  );
}

function StatValue({ children }) {
  return (
    <Typography sx={{ fontSize: 32, fontWeight: 700, color: T.slate900, lineHeight: 1.1 }}>
      {children}
    </Typography>
  );
}

function StatSubtext({ children }) {
  return (
    <Typography sx={{ fontSize: 12.5, color: T.slate600, fontWeight: 500 }}>
      {children}
    </Typography>
  );
}

function ChartCard({ children }) {
  return (
    <Box
      sx={{
        bgcolor: T.white,
        borderRadius: "8px",
        border: `1px solid ${T.slate200}`,
        p: 3,
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {children}
    </Box>
  );
}

function ChartHeader({ title, subtitle, action }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2.5, flexWrap: "wrap", gap: 1 }}>
      <Box>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: T.slate900 }}>{title}</Typography>
        {subtitle && (
          <Typography sx={{ fontSize: 12, color: T.slate400, fontWeight: 500, mt: 0.25 }}>{subtitle}</Typography>
        )}
      </Box>
      {action && <Box>{action}</Box>}
    </Box>
  );
}

// ── Classification mini-chip ────────────────────────────────────────────────
const CLASSIF_COLORS = {
  Simple: { bg: "#ECFDF5", color: "#059669", border: "rgba(16, 185, 129, 0.25)" },
  Complex: { bg: "#FFFBEB", color: "#D97706", border: "rgba(217, 119, 6, 0.25)" },
  "Highly Technical": { bg: "#FEF2F2", color: "#DC2626", border: "rgba(220, 38, 38, 0.25)" },
};

function ClassifChip({ label, count }) {
  const { bg, color, border } = CLASSIF_COLORS[label] || { bg: T.slate100, color: T.slate600, border: "rgba(0,0,0,0.1)" };
  return (
    <Box
      component="span"
      sx={{
        fontSize: "0.72rem",
        fontWeight: 700,
        px: "10px",
        py: "3px",
        borderRadius: "9999px",
        bgcolor: bg,
        color,
        border: `1px solid ${border}`,
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {label}{count !== undefined ? ` · ${count}` : ""}
    </Box>
  );
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
    <Box sx={{ display: "inline-block", maxWidth: 380 }}>
      <Typography
        ref={textRef}
        component="span"
        sx={{
          fontWeight: 700,
          fontSize: "0.8125rem",
          lineHeight: 1.35,
          color: "#0F172A",
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

// ── Holiday row ─────────────────────────────────────────────────────────────
const HOLIDAY_TYPE_COLORS = {
  REGULAR: { bg: "#FEF2F2", color: "#B91C1C", border: "rgba(185, 28, 28, 0.2)", label: "National" },
  SPECIAL_NON_WORKING: { bg: "#FFFBEB", color: "#92400E", border: "rgba(146, 64, 14, 0.2)", label: "Local" },
  COMPANY: { bg: "#EFF6FF", color: "#1D4ED8", border: "rgba(29, 78, 216, 0.2)", label: "Campus" },
  National: { bg: "#FEF2F2", color: "#B91C1C", border: "rgba(185, 28, 28, 0.2)", label: "National" },
  Local: { bg: "#FFFBEB", color: "#92400E", border: "rgba(146, 64, 14, 0.2)", label: "Local" },
  Campus: { bg: "#EFF6FF", color: "#1D4ED8", border: "rgba(29, 78, 216, 0.2)", label: "Campus" },
};

function HolidayRow({ holiday }) {
  let month = "JAN", day = "1";
  try {
    const d = new Date(holiday.date || holiday.holiday_date);
    if (!isNaN(d.getTime())) {
      month = d.toLocaleString("default", { month: "short" }).toUpperCase();
      day = d.getDate();
    }
  } catch (_) {}

  const typeStyle = HOLIDAY_TYPE_COLORS[holiday.type] || { bg: "#F3F4F6", color: "#6B7280", border: "#E5E7EB", label: holiday.type || "Declared" };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: "10px 12px",
        borderRadius: "8px",
        bgcolor: "#FFFFFF",
        border: "1px solid #E2E8F0",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        transition: "all 0.15s ease",
        "&:hover": { bgcolor: "#F8FAFC", borderColor: "#CBD5E1", transform: "translateY(-1px)" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 40,
          height: 40,
          bgcolor: "var(--maroon, #580000)",
          borderRadius: "6px",
          color: T.white,
          flexShrink: 0,
        }}
      >
        <Typography sx={{ fontSize: 8.5, fontWeight: 800, letterSpacing: "0.05em", opacity: 0.9, textTransform: "uppercase", lineHeight: 1 }}>
          {month}
        </Typography>
        <Typography sx={{ fontSize: 15, fontWeight: 800, lineHeight: 1.1, mt: 0.25 }}>
          {day}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflow: "hidden" }}>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 700,
            color: T.slate900,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {holiday.name}
        </Typography>
        <Box
          component="span"
          sx={{
            display: "inline-block",
            fontSize: "10px",
            fontWeight: 700,
            px: "8px",
            py: "1px",
            borderRadius: "9999px",
            mt: 0.5,
            bgcolor: typeStyle.bg,
            color: typeStyle.color,
            border: `1px solid ${typeStyle.border}`,
          }}
        >
          {typeStyle.label}
        </Box>
      </Box>
    </Box>
  );
}

const getCategoryName = (responsibleUnit) => {
  if (!responsibleUnit) return "OTHER SYSTEM";
  const upper = responsibleUnit.toUpperCase();
  if (upper.includes("ADMIN")) return "ADMIN SYSTEM";
  if (upper.includes("ACAD") || upper.includes("ACADEMIC")) return "ACADEMIC SYSTEM";
  if (upper.includes("OSAS") || upper.includes("STUDENT")) return "STUDENT SYSTEM";
  return `${responsibleUnit.toUpperCase()} SYSTEM`;
};

// ── Main Dashboard Page ─────────────────────────────────────────────────────
export default function Dashboard() {
  const { services, fetchServices, kpis, fetchKpis, periods, fetchPeriods, holidays, fetchHolidays, permissions, activeUser } = useAppStore();
  const [summaryData, setSummaryData] = useState(null);
  const [slaLogs, setSlaLogs] = useState([]);
  const [utilizationData, setUtilizationData] = useState([]);
  const [commitmentsList, setCommitmentsList] = useState([]);
  const [selectedOffice, setSelectedOffice] = useState("OVERALL");
  const [serviceSearch, setServiceSearch] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    fetchServices().catch(err => console.error('Dashboard: fetchServices failed', err));
    fetchKpis().catch(err => console.error('Dashboard: fetchKpis failed', err));
    fetchPeriods().catch(err => console.error('Dashboard: fetchPeriods failed', err));
    fetchHolidays().catch(err => console.error('Dashboard: fetchHolidays failed', err));

    api.getSlaComputationLogs({ limit: 100 })
      .then(res => setSlaLogs(res?.data || (Array.isArray(res) ? res : [])))
      .catch(err => console.error('Dashboard: getSlaComputationLogs failed', err));

    api.getServiceUtilization()
      .then(res => setUtilizationData(res || []))
      .catch(err => console.error('Dashboard: getServiceUtilization failed', err));

    api.getCommitments({ limit: 100 })
      .then(res => setCommitmentsList(res?.data || (Array.isArray(res) ? res : [])))
      .catch(err => console.error('Dashboard: getCommitments failed', err));
  }, []);

  useEffect(() => {
    api.getDashboardSummary({ office: permissions?.canSeeOtherOffices ? selectedOffice : undefined })
      .then(setSummaryData)
      .catch(err => console.error('Dashboard: getDashboardSummary failed', err));
  }, [selectedOffice, permissions?.canSeeOtherOffices]);

  // Reset pagination on office or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedOffice, serviceSearch, classificationFilter]);

  // ── Computed metrics & Office Scope ─────────────────────────────────────
  const currentOfficeScope = permissions?.canSeeOtherOffices ? selectedOffice : (activeUser?.office || 'ACAD');

  const officeServices = useMemo(() => {
    return services.filter(s => {
      if (!currentOfficeScope || currentOfficeScope === 'OVERALL') return true;
      const sOffice = s.office || s.responsible_unit || s.responsibleUnit;
      return normalizeOffice(sOffice) === normalizeOffice(currentOfficeScope);
    });
  }, [services, currentOfficeScope]);

  const filteredServices = useMemo(() => {
    return officeServices.filter((svc) => {
      const q = serviceSearch.trim().toLowerCase();
      const officeCode = getOfficeBadge(svc.office || svc.responsible_unit || svc.responsibleUnit).label;
      const matchesSearch = !q ||
        (svc.name || "").toLowerCase().includes(q) ||
        (svc.office || svc.responsible_unit || svc.responsibleUnit || "").toLowerCase().includes(q) ||
        officeCode.toLowerCase().includes(q) ||
        (svc.service_mode || "").toLowerCase().includes(q);

      const classif = getArtaClassification(svc);
      const matchesClassif = classificationFilter === "ALL" || classif === classificationFilter;

      return matchesSearch && matchesClassif;
    });
  }, [officeServices, serviceSearch, classificationFilter]);

  const totalPages = Math.ceil(filteredServices.length / rowsPerPage);

  const officeKpis = useMemo(() => {
    return kpis.filter(k => {
      if (!currentOfficeScope || currentOfficeScope === 'OVERALL') return true;
      const kOffice = k.office || k.sub_office;
      return normalizeOffice(kOffice) === normalizeOffice(currentOfficeScope);
    });
  }, [kpis, currentOfficeScope]);

  const totalServices = officeServices.filter(s => !s.archived).length;
  const isOfficeMatch = normalizeOffice(summaryData?.office) === normalizeOffice(currentOfficeScope) || currentOfficeScope === 'OVERALL';
  const activeServices = (summaryData?.active_services_count !== undefined && isOfficeMatch)
    ? summaryData.active_services_count
    : officeServices.filter(s => s.status === 'Active' || (s.active && !s.archived)).length;
  const inactiveServices = Math.max(0, totalServices - activeServices);
  const naFlaggedServicesCount = officeServices.filter(s => (s.na_flags && s.na_flags.length > 0) || (s.naFlag && !s.archived)).length;

  const totalKpis = officeKpis.length;
  const activeKpis = (summaryData?.kpi_count !== undefined || summaryData?.active_kpis_count !== undefined) && isOfficeMatch
    ? (summaryData.kpi_count ?? summaryData.active_kpis_count)
    : officeKpis.filter(k => k.active !== false).length;
  const inactiveKpis = Math.max(0, totalKpis - activeKpis);

  // Active evaluation period determination
  const activePeriod =
    summaryData?.current_period ||
    summaryData?.active_period ||
    periods.find(p => p.status === 'Active' || p.status === 'Open') ||
    null;

  const periodDateRange = activePeriod?.start_date && activePeriod?.end_date
    ? `${new Date(activePeriod.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(activePeriod.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : "No data available";

  const commitmentStatus = summaryData?.commitment_status || "No data available";

  // Format unit helper to ensure proper singular/plural grammar (e.g. 1 Day vs 2 Days)
  const formatTargetUnit = (val, rawUnit) => {
    if (!rawUnit) return val === 1 ? ' transaction' : ' transactions';
    const u = String(rawUnit).trim().toUpperCase();
    if (u === 'PERCENT' || u === '%') return '%';
    if (u === 'DAY' || u === 'DAYS') return val === 1 ? ' Day' : ' Days';
    if (u === 'HOUR' || u === 'HOURS') return val === 1 ? ' Hour' : ' Hours';
    if (u === 'MINUTE' || u === 'MINUTES') return val === 1 ? ' Minute' : ' Minutes';
    if (u === 'TRANSACTION' || u === 'TRANSACTIONS') return val === 1 ? ' Transaction' : ' Transactions';
    return ` ${rawUnit}`;
  };

  // Helpers for Service Table SLA & Commitment targets
  const getSlaTarget = (svc) => {
    if (svc.sla_target_value && svc.sla_target_unit) {
      const val = parseFloat(svc.sla_target_value);
      const unit = formatTargetUnit(val, svc.sla_target_unit);
      return `${isNaN(val) ? svc.sla_target_value : val}${unit}`;
    }
    if (summaryData?.services?.length) {
      const summaryItem = summaryData.services.find(s => s.id === svc.id || s.name === svc.name);
      if (summaryItem?.sla_target) return summaryItem.sla_target;
    }
    return "No data available";
  };

  const getCommitmentTarget = (svc) => {
    if (summaryData?.services?.length) {
      const summaryItem = summaryData.services.find(s => s.id === svc.id || s.name === svc.name);
      if (summaryItem && summaryItem.commitment_target !== null && summaryItem.commitment_target !== undefined) {
        const val = parseFloat(summaryItem.commitment_target);
        return `${isNaN(val) ? summaryItem.commitment_target : val}${val === 1 ? ' transaction' : ' transactions'}`;
      }
    }
    if (commitmentsList?.length) {
      const matchedComm = commitmentsList.find(c => normalizeOffice(c.office) === normalizeOffice(svc.office || svc.responsible_unit || svc.responsibleUnit));
      if (matchedComm?.items?.length) {
        const item = matchedComm.items.find(i => i.service_id === svc.id);
        if (item && item.target_value !== null && item.target_value !== undefined) {
          const val = parseFloat(item.target_value);
          const unit = formatTargetUnit(val, item.unit);
          return `${isNaN(val) ? item.target_value : val}${unit}`;
        }
      }
    }
    return null;
  };

  const renderModes = (svc) => {
    const modesList = Array.isArray(svc.modes) && svc.modes.length > 0
      ? svc.modes.map(m => typeof m === 'object' ? (m.name || m.id) : m)
      : (svc.service_mode ? [svc.service_mode] : []);

    if (modesList.length === 0) return null;

    return (
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
        {modesList.map((mName, idx) => (
          <Chip
            key={idx}
            label={mName}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: '0.7rem',
              bgcolor: '#FDF2F2',
              color: '#800000',
              border: '1px solid rgba(128, 0, 0, 0.15)',
              maxWidth: 200,
              '& .MuiChip-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
                px: 1,
              },
            }}
          />
        ))}
      </Box>
    );
  };

  // Compute SLA Compliance from actual SlaComputationLogs
  const serviceComplianceList = officeServices
    .map(service => {
      const serviceLogs = slaLogs.filter(log => log.service_id === service.id || log.service_name === service.name);
      if (serviceLogs.length === 0) return null;

      const compliantLogs = serviceLogs.filter(log => {
        const duration = Number(log.computed_duration_days);
        const target = Number(log.sla_target_days);
        return duration <= target;
      });

      const complianceRate = Math.round((compliantLogs.length / serviceLogs.length) * 100);
      let color = "#580000";
      if (complianceRate >= 95) color = "#10B981";
      else if (complianceRate < 80) color = "#D97706";

      return {
        id: service.id,
        name: service.name,
        responsibleUnit: service.responsible_unit || service.responsibleUnit,
        office: service.office,
        value: complianceRate,
        color
      };
    })
    .filter(Boolean);

  // Group compliance by category
  const complianceByCategory = {};
  serviceComplianceList.forEach(item => {
    const cat = getCategoryName(item.office || item.responsibleUnit);
    if (!complianceByCategory[cat]) {
      complianceByCategory[cat] = [];
    }
    complianceByCategory[cat].push(item);
  });

  // Generate actual vs target data for the bar chart
  const chartData = (summaryData?.services || officeServices)
    .map(service => {
      const util = utilizationData.find(u => u.service_id === service.id || u.service_name === service.name);
      const actual = util ? util.transaction_count : 0;
      let target = service.commitment_target;
      if (target === undefined || target === null) {
        const targetStr = getCommitmentTarget(service);
        if (targetStr) {
          target = parseFloat(targetStr);
        }
      }

      if ((target === null || target === undefined || isNaN(target)) && actual === 0) return null;

      return {
        id: service.id,
        name: service.name,
        actual,
        target: isNaN(target) ? 0 : target
      };
    })
    .filter(Boolean)
    .slice(0, 5);

  const chartMaxVal = chartData.length > 0 ? Math.max(...chartData.map(d => Math.max(d.actual, d.target)), 10) : 10;
  const chartN = chartData.length;
  const chartXSpacing = chartN > 0 ? 400 / chartN : 80;

  // Group holidays chronologically
  const uniqueHolidays = [];
  holidays.forEach(h => {
    const nameLower = h.name.toLowerCase();
    const existing = uniqueHolidays.find(u => u.name.toLowerCase() === nameLower && u.type === h.type);
    if (!existing) uniqueHolidays.push(h);
  });

  const upcomingHolidays = [...uniqueHolidays]
    .sort((a, b) => {
      const dateA = new Date(a.date || a.holiday_date);
      const dateB = new Date(b.date || b.holiday_date);
      if (dateA.getMonth() !== dateB.getMonth()) return dateA.getMonth() - dateB.getMonth();
      return dateA.getDate() - dateB.getDate();
    })
    .slice(0, 6);

  const activeServicesRatio = totalServices > 0 ? Math.round((activeServices / totalServices) * 100) : 0;
  const activeKpisRatio = totalKpis > 0 ? Math.round((activeKpis / totalKpis) * 100) : 0;

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, bgcolor: T.slate50, minHeight: "100vh", fontFamily: '"DM Sans", sans-serif' }}>
      <PageHeader
        breadcrumb="Dashboard"
        title="Performance Overview"
        subtitle="Monitor key metrics, track commitments, and view performance insights at a glance."
      />

      {/* Notice / Warning Bar */}
      {!activePeriod ? (
        <Alert
          severity="warning"
          sx={{
            mb: 3,
            borderRadius: "8px",
            border: "1.5px solid rgba(245, 158, 11, 0.3)",
            bgcolor: "#FFFBEB",
            color: "#B45309",
            fontWeight: 600,
            "& .MuiAlert-icon": { color: "#D97706" }
          }}
        >
          No active evaluation period set.
        </Alert>
      ) : (
        <Alert
          severity="info"
          sx={{
            mb: 3,
            borderRadius: "8px",
            border: "1.5px solid rgba(88, 0, 0, 0.15)",
            bgcolor: "#FEF2F2",
            color: "#580000",
            fontWeight: 600,
            "& .MuiAlert-icon": { color: "#580000" }
          }}
        >
          Active Cycle: <strong>{activePeriod.name}</strong> ({periodDateRange}). Review commitments and service standards regularly to ensure timely compliance.
        </Alert>
      )}

      {/* Office Scope Switcher for CD / Superadmin */}
      {permissions?.canSeeOtherOffices && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 36,
              height: 36,
              borderRadius: "8px",
              bgcolor: "#580000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF"
            }}>
              <BusinessIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Active Office View
              </Typography>
              <Typography sx={{ fontSize: "0.95rem", fontWeight: 700, color: "#0F172A" }}>
                {selectedOffice === "OVERALL" ? "Campus-Wide / All Offices" : `${selectedOffice} Office`}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>
              Filter Office:
            </Typography>
            <TextField
              select
              size="small"
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              sx={{
                width: 230,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  height: '38px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#1E293B',
                  '& fieldset': { borderColor: '#CBD5E1' },
                  '&:hover fieldset': { borderColor: '#94A3B8' },
                  '&.Mui-focused fieldset': { borderColor: '#580000', borderWidth: '1.5px' },
                }
              }}
            >
              <MenuItem value="OVERALL">Overall / All Offices</MenuItem>
              <MenuItem value="ADMIN">Administration (ADMIN)</MenuItem>
              <MenuItem value="ACAD">Academic Affairs (ACAD)</MenuItem>
              <MenuItem value="OSAS">Student Affairs (OSAS)</MenuItem>
            </TextField>
          </Box>
        </Box>
      )}

      {/* ── Top Stat Cards (Clean style matching Image 2) ── */}
      <Box sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
        gap: { xs: 1.25, sm: 2, md: "20px" },
        mb: 3.5,
      }}>
        {/* Card 1: Current Period */}
        <Box
          sx={{
            bgcolor: "#FFFFFF",
            borderRadius: "8px",
            border: "1px solid #E2E8F0",
            p: { xs: "14px 12px", sm: "18px 20px", md: "20px 24px" },
            pt: { xs: "18px", sm: "22px" },
            minHeight: { xs: 110, sm: 122 },
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
          <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", bgcolor: activePeriod ? "#10B981" : "#94A3B8" }} />
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, mb: 0.75, flexWrap: "wrap", gap: 0.5 }}>
            <Typography sx={{ fontSize: { xs: 9.5, sm: 11 }, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Current Period
            </Typography>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: { xs: "6px", sm: "8px" },
                py: { xs: "1px", sm: "2px" },
                borderRadius: "9999px",
                fontSize: { xs: 9, sm: 10.5 },
                fontWeight: 700,
                bgcolor: activePeriod ? "#ECFDF5" : "#F1F5F9",
                color: activePeriod ? "#047857" : "#64748B",
                whiteSpace: "nowrap",
              }}
            >
              <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: activePeriod ? "#047857" : "#94A3B8" }} />
              {activePeriod ? "Active" : "Inactive"}
            </Box>
          </Box>
          <Box sx={{ my: 0.5 }}>
            <Typography sx={{ fontSize: { xs: "1.1rem", sm: "1.3rem", md: 24 }, fontWeight: 700, color: "#0F172A", lineHeight: 1.15 }}>
              {activePeriod ? activePeriod.name : "No active period"}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: { xs: 11, sm: 12, md: 13 }, color: "#475569", fontWeight: 500, lineHeight: 1.2 }}>
            {periodDateRange}
          </Typography>
        </Box>

        {/* Card 2: Active Services */}
        <Box
          sx={{
            bgcolor: "#FFFFFF",
            borderRadius: "8px",
            border: "1px solid #E2E8F0",
            p: { xs: "14px 12px", sm: "18px 20px", md: "20px 24px" },
            pt: { xs: "18px", sm: "22px" },
            minHeight: { xs: 110, sm: 122 },
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
              Active Services
            </Typography>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: { xs: "6px", sm: "8px" },
                py: { xs: "1px", sm: "2px" },
                borderRadius: "9999px",
                fontSize: { xs: 9, sm: 10.5 },
                fontWeight: 700,
                bgcolor: "#FFFBEB",
                color: "#B45309",
                whiteSpace: "nowrap",
              }}
            >
              <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#D97706" }} />
              {activeServicesRatio}% Active
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, my: 0.5 }}>
            <Typography sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>
              {activeServices}
            </Typography>
            <Typography sx={{ fontSize: { xs: 14, sm: 16, md: 18 }, color: "#94A3B8", fontWeight: 500 }}>
              / {totalServices}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: { xs: 11, sm: 12, md: 13 }, color: "#475569", fontWeight: 500, lineHeight: 1.2 }}>
            {totalServices > 0 ? `${inactiveServices} services inactive` : "No data available"}
          </Typography>
        </Box>

        {/* Card 3: KPI Standards */}
        <Box
          sx={{
            bgcolor: "#FFFFFF",
            borderRadius: "8px",
            border: "1px solid #E2E8F0",
            p: { xs: "14px 12px", sm: "18px 20px", md: "20px 24px" },
            pt: { xs: "18px", sm: "22px" },
            minHeight: { xs: 110, sm: 122 },
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
          <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", bgcolor: "#580000" }} />
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, mb: 0.75, flexWrap: "wrap", gap: 0.5 }}>
            <Typography sx={{ fontSize: { xs: 9.5, sm: 11 }, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              KPI Standards
            </Typography>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: { xs: "6px", sm: "8px" },
                py: { xs: "1px", sm: "2px" },
                borderRadius: "9999px",
                fontSize: { xs: 9, sm: 10.5 },
                fontWeight: 700,
                bgcolor: "#FEF2F2",
                color: "#580000",
                whiteSpace: "nowrap",
              }}
            >
              <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#580000" }} />
              {activeKpisRatio}% Configured
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, my: 0.5 }}>
            <Typography sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>
              {activeKpis}
            </Typography>
            <Typography sx={{ fontSize: { xs: 14, sm: 16, md: 18 }, color: "#94A3B8", fontWeight: 500 }}>
              / {totalKpis}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: { xs: 11, sm: 12, md: 13 }, color: "#475569", fontWeight: 500, lineHeight: 1.2 }}>
            {totalKpis > 0 ? `${inactiveKpis} KPIs inactive` : "No data available"}
          </Typography>
        </Box>

        {/* Card 4: Commitment Status */}
        <Box
          sx={{
            bgcolor: "#FFFFFF",
            borderRadius: "8px",
            border: "1px solid #E2E8F0",
            p: { xs: "14px 12px", sm: "18px 20px", md: "20px 24px" },
            pt: { xs: "18px", sm: "22px" },
            minHeight: { xs: 110, sm: 122 },
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
          <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", bgcolor: "#2563EB" }} />
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, mb: 0.75, flexWrap: "wrap", gap: 0.5 }}>
            <Typography sx={{ fontSize: { xs: 9.5, sm: 11 }, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Commitment Status
            </Typography>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: { xs: "6px", sm: "8px" },
                py: { xs: "1px", sm: "2px" },
                borderRadius: "9999px",
                fontSize: { xs: 9, sm: 10.5 },
                fontWeight: 700,
                bgcolor: "#EFF6FF",
                color: "#1D4ED8",
                whiteSpace: "nowrap",
              }}
            >
              <Box sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#2563EB" }} />
              Standard
            </Box>
          </Box>
          <Box sx={{ my: 0.5 }}>
            <Typography sx={{ fontSize: { xs: "1.05rem", sm: "1.25rem", md: 24 }, fontWeight: 700, color: "#0F172A", lineHeight: 1.2 }}>
              {commitmentStatus}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: { xs: 11, sm: 12, md: 13 }, color: "#475569", fontWeight: 500, lineHeight: 1.2 }}>
            {totalServices > 0 ? `${naFlaggedServicesCount} services flagged N/A` : "No data available"}
          </Typography>
        </Box>
      </Box>

      {/* ── Charts & Visuals Grid ── */}
      <Box sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "1.2fr 1fr" },
        gap: 3,
        mb: 3,
      }}>
        {/* SLA Compliance by Service Category */}
        <Box sx={{
          bgcolor: "#FFFFFF",
          borderRadius: "10px",
          border: "1px solid #E2E8F0",
          p: 3,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column"
        }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5, flexWrap: "wrap", gap: 1 }}>
            <Box>
              <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#0F172A" }}>
                SLA Compliance by Service Category
              </Typography>
              <Typography sx={{ fontSize: "0.78rem", color: "#64748B", mt: 0.25 }}>
                Real-time target vs actual processing compliance
              </Typography>
            </Box>
            <Chip
              label={activePeriod?.name || "Current Cycle"}
              size="small"
              sx={{
                bgcolor: "#FEF2F2",
                color: "#580000",
                fontWeight: 700,
                fontSize: "0.72rem",
                border: "1px solid rgba(88, 0, 0, 0.15)",
              }}
            />
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
            {Object.keys(complianceByCategory).length > 0 ? (
              Object.keys(complianceByCategory).map((categoryName, idx) => (
                <Box key={categoryName} sx={{ display: "flex", flexDirection: "column" }}>
                  {idx > 0 && <Box sx={{ borderBottom: "1px solid #F1F5F9", my: 2 }} />}
                  <Typography sx={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#64748B",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    mb: 1.5,
                  }}>
                    {categoryName}
                  </Typography>
                  {complianceByCategory[categoryName].map((item) => (
                    <Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5, "&:last-child": { mb: 0 } }}>
                      <Typography sx={{
                        width: 180,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#334155",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }} title={item.name}>
                        {item.name}
                      </Typography>
                      <Box sx={{ flex: 1, height: 7, bgcolor: "#F1F5F9", borderRadius: 4, position: "relative", overflow: "hidden" }}>
                        <Box sx={{ width: `${item.value}%`, height: "100%", bgcolor: item.color, borderRadius: 4, transition: "width 0.4s ease" }} />
                      </Box>
                      <Typography sx={{
                        width: 42,
                        textAlign: "right",
                        fontSize: 13,
                        fontWeight: 800,
                        color: item.color,
                      }}>
                        {item.value}%
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ))
            ) : (
              <Box sx={{ py: 6, textAlign: "center", bgcolor: "#F8FAFC", borderRadius: "8px", border: "1px dashed #CBD5E1" }}>
                <SpeedIcon sx={{ fontSize: 36, color: "#CBD5E1", mb: 1 }} />
                <Typography sx={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>
                  No SLA computation records yet for {currentOfficeScope}
                </Typography>
                <Typography sx={{ fontSize: 12, color: "#94A3B8", mt: 0.5 }}>
                  Transactions will automatically compute SLA adherence once logged.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Transactions vs Target Chart */}
        <Box sx={{
          bgcolor: "#FFFFFF",
          borderRadius: "10px",
          border: "1px solid #E2E8F0",
          p: 3,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column"
        }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2, flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#0F172A" }}>
                Transactions vs Target
              </Typography>
              <Typography sx={{ fontSize: "0.78rem", color: "#64748B", fontWeight: 500, mt: 0.25 }}>
                Top services · {activePeriod?.name || "No active period"}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: "#580000" }} />
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Actual</Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: "#E2E8F0" }} />
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#64748B" }}>Target</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ width: "100%", overflow: "hidden", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {chartData.length > 0 ? (
              <Box sx={{ width: "100%", position: "relative" }}>
                <svg width="100%" viewBox="0 0 500 320" fill="none" style={{ display: "block" }}>
                  {[50, 105, 160, 215, 270].map((yVal, idx) => {
                    const val = Math.round(chartMaxVal - (idx * chartMaxVal) / 4);
                    return (
                      <g key={yVal}>
                        <text
                          x="18"
                          y={yVal + 4}
                          fill="#94A3B8"
                          fontSize="9.5"
                          fontWeight="600"
                          textAnchor="end"
                          fontFamily="'DM Sans', sans-serif"
                        >
                          {val}
                        </text>
                        <line
                          x1="28"
                          y1={yVal}
                          x2="480"
                          y2={yVal}
                          stroke="#F1F5F9"
                          strokeWidth="1"
                          strokeDasharray={yVal === 270 ? "none" : "4 4"}
                        />
                      </g>
                    );
                  })}

                  {chartData.map((item, i) => {
                    const xStart = 38 + i * chartXSpacing + (chartXSpacing - 36) / 2;
                    const actualHeight = (item.actual / chartMaxVal) * 210;
                    const targetHeight = (item.target / chartMaxVal) * 210;
                    const labelText = item.name.length > 11 ? `${item.name.substring(0, 9)}...` : item.name;

                    return (
                      <g key={item.id}>
                        <rect
                          x={xStart}
                          y={270 - actualHeight}
                          width="16"
                          height={actualHeight}
                          rx="3"
                          fill="#580000"
                        />
                        <rect
                          x={xStart + 19}
                          y={270 - targetHeight}
                          width="16"
                          height={targetHeight}
                          rx="3"
                          fill="#CBD5E1"
                        />
                        <text
                          x={xStart + 17}
                          y="295"
                          fill="#64748B"
                          fontSize="9.5"
                          fontWeight="700"
                          textAnchor="middle"
                          fontFamily="'DM Sans', sans-serif"
                        >
                          {labelText}
                        </text>
                      </g>
                    );
                  })}

                  <line x1="28" y1="270" x2="480" y2="270" stroke="#CBD5E1" strokeWidth="1.5" />
                </svg>
              </Box>
            ) : (
              <Box sx={{ py: 6, width: "100%", textAlign: "center", bgcolor: "#F8FAFC", borderRadius: "8px", border: "1px dashed #CBD5E1" }}>
                <AssessmentIcon sx={{ fontSize: 36, color: "#CBD5E1", mb: 1 }} />
                <Typography sx={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>
                  No transaction target data to display
                </Typography>
                <Typography sx={{ fontSize: 12, color: "#94A3B8", mt: 0.5 }}>
                  Define OPCR commitment targets to populate this comparison.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Holidays List */}
        <Box sx={{ gridColumn: "1 / -1" }}>
          <Box sx={{
            bgcolor: "#FFFFFF",
            borderRadius: "10px",
            border: "1px solid #E2E8F0",
            p: 3,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Box sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  bgcolor: "#FEF2F2",
                  color: "#580000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <CalendarMonthIcon sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: "#0F172A" }}>
                    Declared Holidays & Suspensions
                  </Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "#64748B" }}>
                    Excluded from SLA working-days computation
                  </Typography>
                </Box>
              </Box>
              <Chip
                label={`${uniqueHolidays.length} declared`}
                size="small"
                sx={{
                  bgcolor: "#F8FAFC",
                  color: "#475569",
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  border: "1px solid #CBD5E1"
                }}
              />
            </Box>

            <Box sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
              gap: 1.5,
            }}>
              {upcomingHolidays.length > 0 ? (
                upcomingHolidays.map(h => <HolidayRow key={h.id} holiday={h} />)
              ) : (
                <Box sx={{ gridColumn: "1 / -1", py: 4, textAlign: "center", bgcolor: "#F8FAFC", borderRadius: "8px" }}>
                  <Typography sx={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>
                    No holidays declared for this period.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Services Table Section ── */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{
          bgcolor: "#FFFFFF",
          borderRadius: "10px",
          border: "1px solid #E2E8F0",
          p: 3,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
        }}>
          {/* Table Header & Controls Toolbar */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, mb: 2.5, flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: "1.05rem", fontWeight: 700, color: "#0F172A" }}>
                Seeded Services & Performance Targets
              </Typography>
              <Typography sx={{ fontSize: "0.78rem", color: "#64748B", mt: 0.25 }}>
                Showing {filteredServices.length} of {officeServices.length} service{officeServices.length !== 1 ? 's' : ''} for {currentOfficeScope === 'OVERALL' ? 'All Offices' : currentOfficeScope}
              </Typography>
            </Box>

            {/* Interactive Filters */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
              {/* Search input */}
              <TextField
                size="small"
                placeholder="Search services or modes..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: "#94A3B8" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  width: { xs: "100%", sm: 240 },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    height: '36px',
                    fontSize: '0.8125rem',
                    bgcolor: '#FFFFFF',
                    '& fieldset': { borderColor: '#CBD5E1' },
                    '&:hover fieldset': { borderColor: '#94A3B8' },
                    '&.Mui-focused fieldset': { borderColor: '#580000', borderWidth: '1.5px' },
                  }
                }}
              />

              {/* Classification filter */}
              <TextField
                select
                size="small"
                value={classificationFilter}
                onChange={(e) => setClassificationFilter(e.target.value)}
                sx={{
                  width: { xs: "100%", sm: 170 },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    height: '36px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    bgcolor: '#FFFFFF',
                    '& fieldset': { borderColor: '#CBD5E1' },
                    '&:hover fieldset': { borderColor: '#94A3B8' },
                    '&.Mui-focused fieldset': { borderColor: '#580000', borderWidth: '1.5px' },
                  }
                }}
              >
                <MenuItem value="ALL">All Classifications</MenuItem>
                <MenuItem value="Simple">Simple</MenuItem>
                <MenuItem value="Complex">Complex</MenuItem>
                <MenuItem value="Highly Technical">Highly Technical</MenuItem>
              </TextField>

              {/* Reset filter button if active */}
              {(serviceSearch || classificationFilter !== "ALL") && (
                <Button
                  size="small"
                  variant="text"
                  onClick={() => {
                    setServiceSearch("");
                    setClassificationFilter("ALL");
                  }}
                  sx={{
                    color: "#580000",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    textTransform: "none",
                    height: 36,
                    "&:hover": { bgcolor: "#FEF2F2" }
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </Box>
          </Box>

          {/* Table */}
          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: "8px", overflow: "hidden" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#580000", "& .MuiTableCell-root": { py: 1.5, color: "#FFFFFF", fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.04em", borderBottom: "none" } }}>
                  {permissions?.canSeeOtherOffices && (
                    <TableCell sx={{ color: "#FFFFFF", width: 110 }}>OFFICE</TableCell>
                  )}
                  <TableCell sx={{ color: "#FFFFFF", pl: permissions?.canSeeOtherOffices ? 2 : 2.5, width: permissions?.canSeeOtherOffices ? "30%" : "38%" }}>SERVICE NAME</TableCell>
                  <TableCell sx={{ color: "#FFFFFF", width: "18%" }}>SERVICE MODE</TableCell>
                  <TableCell sx={{ color: "#FFFFFF", width: "13%" }}>CLASSIFICATION</TableCell>
                  <TableCell sx={{ color: "#FFFFFF", width: "12%" }}>SLA TARGET</TableCell>
                  <TableCell sx={{ color: "#FFFFFF", width: "14%" }}>COMMITMENT TARGET</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredServices.length > 0 ? (
                  filteredServices
                    .slice((currentPage - 1) * rowsPerPage, (currentPage - 1) * rowsPerPage + rowsPerPage)
                    .map((svc) => (
                      <TableRow
                        key={svc.id}
                        hover
                        sx={{
                          "&:hover": { bgcolor: "#F8FAFC" },
                          "& .MuiTableCell-root": {
                            py: 1.5,
                            borderBottom: "1px solid #CBD5E1",
                            boxShadow: "inset 0 -1.5px 0 0 rgba(0, 0, 0, 0.04)",
                            fontSize: "0.8125rem"
                          }
                        }}
                      >
                        {permissions?.canSeeOtherOffices && (
                          <TableCell sx={{ width: 110 }}>
                            {(() => {
                              const ob = getOfficeBadge(svc.office || svc.responsible_unit || svc.responsibleUnit);
                              if (ob.label === "—") return <Typography color="text.disabled">—</Typography>;
                              return (
                                <Tooltip title={ob.full} arrow placement="top">
                                  <Chip
                                    label={ob.label}
                                    size="small"
                                    sx={{
                                      fontWeight: 800,
                                      fontSize: "0.7rem",
                                      bgcolor: ob.bg,
                                      color: ob.text,
                                      border: `1px solid ${ob.border}`,
                                    }}
                                  />
                                </Tooltip>
                              );
                            })()}
                          </TableCell>
                        )}
                        <TableCell sx={{ minWidth: 260, maxWidth: 380, pl: permissions?.canSeeOtherOffices ? 2 : 2.5 }}>
                          <ExpandableText text={svc.name} />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          {renderModes(svc) || <Typography color="text.disabled">—</Typography>}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const artaClass = getArtaClassification(svc);
                            return (
                              <Chip
                                label={artaClass}
                                size="small"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: "0.7rem",
                                  ...(artaClass === "Highly Technical" && { bgcolor: "#FEF2F2", color: "#EF4444", border: "1px solid rgba(239, 68, 68, 0.15)" }),
                                  ...(artaClass === "Complex" && { bgcolor: "#FFFBEB", color: "#D97706", border: "1px solid rgba(217, 119, 6, 0.15)" }),
                                  ...(artaClass === "Simple" && { bgcolor: "#ECFDF5", color: "#10B981", border: "1px solid rgba(16, 185, 129, 0.15)" })
                                }}
                              />
                            );
                          })()}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: "#0F172A" }}>
                          {getSlaTarget(svc) === "No data available" ? (
                            <Typography color="text.disabled">—</Typography>
                          ) : (
                            getSlaTarget(svc)
                          )}
                        </TableCell>
                        <TableCell>
                          {getCommitmentTarget(svc) ? (
                            <Chip
                              label={getCommitmentTarget(svc)}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.72rem",
                                bgcolor: "#FEF2F2",
                                color: "#580000",
                                border: "1px solid rgba(88, 0, 0, 0.15)",
                              }}
                            />
                          ) : (
                            <Typography color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={permissions?.canSeeOtherOffices ? 6 : 5} align="center" sx={{ py: 6, color: "#94A3B8", fontSize: "0.875rem" }}>
                      No matching services found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination Container */}
          {filteredServices.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2.5, flexWrap: 'wrap', gap: 2, pr: { xs: 0, sm: 10 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                    '& .MuiSelect-select': { py: 0.5, px: 1.5, fontSize: '0.875rem' },
                    borderRadius: 2
                  }}
                >
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </Box>
              {totalPages > 1 && (
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(_, value) => setCurrentPage(value)}
                  color="primary"
                  shape="rounded"
                />
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

