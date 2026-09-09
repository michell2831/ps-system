import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Card,
  Tabs,
  Tab,
  TextField,
  MenuItem,
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
  Pagination,
  Select,
  Tooltip,
  IconButton,
  InputAdornment,
  Menu,
  Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAppStore } from "../store/useAppStore";
import PageHeader from "../components/PageHeader";
import ResultModal from "../modals/ResultModal";
import KPIModal from "../modals/KPIModal";
import ToggleStatusModal from "../modals/ToggleStatusModal";
import { isInScope } from "../services/permissions";

const CATEGORY_INDICATORS = {
  Timeliness: { color: "#2563EB", bg: "#EFF6FF", label: "Timeliness" },
  Quality: { color: "#D97706", bg: "#FFFBEB", label: "Quality" },
  Efficiency: { color: "#10B981", bg: "#ECFDF5", label: "Efficiency" },
};

const formatDuration = (totalMinutes) => {
  if (!totalMinutes || isNaN(totalMinutes)) return "0m";
  const d = Math.floor(totalMinutes / 1440);
  const h = Math.floor((totalMinutes % 1440) / 60);
  const m = Math.round(totalMinutes % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  return parts.join(" ");
};

const getArtaClassification = (svc) => {
  if (!svc) return "Simple";
  let days = 0;
  if (svc.sla_target_unit === 'Days') {
    days = svc.sla_target_value;
  } else if (svc.sla_target_unit === 'Minutes') {
    days = svc.sla_target_value / 1440;
  } else if (svc.sla_target_unit === 'Hours') {
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

export default function KPIStandards() {
  const {
    services,
    fetchServices,
    kpis,
    fetchKpis,
    createKpi,
    updateKpi,
    deleteKpi,
    permissions,
    activeUser,
  } = useAppStore();

  const canWriteKpi = permissions?.canWriteKpi || false;

  // UI states
  const [activeTab, setActiveTab] = useState(0); // 0: active, 1: deactivated
  const [showAdd, setShowAdd] = useState(false);
  const [editingKpi, setEditingKpi] = useState(null);

  // Form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Timeliness");
  const [target, setTarget] = useState("");
  const [targetDays, setTargetDays] = useState("");
  const [targetHours, setTargetHours] = useState("");
  const [targetMins, setTargetMins] = useState("");
  const [unit, setUnit] = useState(" Days");
  const [serviceId, setServiceId] = useState("");
  const [errors, setErrors] = useState({});

  const [deactivatingKpi, setDeactivatingKpi] = useState(null);
  const [activatingKpi, setActivatingKpi] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [officeFilter, setOfficeFilter] = useState("");

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [resultModal, setResultModal] = useState({ show: false, type: "success", title: "", message: "" });

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedKpi, setSelectedKpi] = useState(null);

  const handleMenuOpen = (event, kpi) => {
    setAnchorEl(event.currentTarget);
    setSelectedKpi(kpi);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    if (selectedKpi) {
      handleOpenEdit(selectedKpi);
    }
    handleMenuClose();
  };

  const handleToggleActiveClick = () => {
    if (selectedKpi) {
      if (selectedKpi.active) {
        setDeactivatingKpi(selectedKpi);
      } else {
        setActivatingKpi(selectedKpi);
      }
    }
    handleMenuClose();
  };

  const triggerSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  useEffect(() => {
    fetchServices();
    fetchKpis();
  }, []);

  const handleOpenAdd = () => {
    setName("");
    setCategory("Timeliness");
    setTarget("");
    setTargetDays("");
    setTargetHours("");
    setTargetMins("");
    setUnit(" Days");
    setServiceId("");
    setErrors({});
    setEditingKpi(null);
    setShowAdd(true);
  };

  const handleOpenEdit = (kpi) => {
    setName(kpi.name);
    setCategory(kpi.category);
    setTarget(Number(kpi.target_value));

    if (kpi.category === "Timeliness" || kpi.category === "Efficiency") {
      const totalMins = Number(kpi.target_value) || 0;
      const d = Math.floor(totalMins / 1440);
      const h = Math.floor((totalMins % 1440) / 60);
      const m = Math.round(totalMins % 60);
      setTargetDays(d || "");
      setTargetHours(h || "");
      setTargetMins(m || "");
    } else {
      setTargetDays("");
      setTargetHours("");
      setTargetMins("");
    }

    setUnit(kpi.unit);
    setServiceId(kpi.service_id || "");
    setErrors({});
    setEditingKpi(kpi);
    setShowAdd(false);
  };

  const closeModal = () => {
    setShowAdd(false);
    setEditingKpi(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const err = {};
    if (!name.trim()) {
      err.name = "KPI Name is required.";
    } else if (name.length > 150) {
      err.name = "KPI target name must not exceed 150 characters.";
    }

    if (!unit || !unit.trim()) {
      err.unit = "Unit is required.";
    }

    if (!serviceId) {
      err.serviceId = "Please link a Service Charter.";
    }

    const isTimeDuration = (category === "Timeliness" || category === "Efficiency") && unit !== "/ 5";
    if (isTimeDuration) {
      const dStr = targetDays.toString().trim();
      const hStr = targetHours.toString().trim();
      const mStr = targetMins.toString().trim();

      if (!dStr && !hStr && !mStr) {
        err.target = "At least one target duration (Days, Hours, or Minutes) is required.";
      } else {
        const daysVal = Number(targetDays) || 0;
        const hoursVal = Number(targetHours) || 0;
        const minsVal = Number(targetMins) || 0;

        if (daysVal < 0 || hoursVal < 0 || minsVal < 0) {
          err.target = "Target duration values cannot be negative.";
        } else if (hoursVal > 23) {
          err.target = "Hours must be between 0 and 23.";
        } else if (minsVal > 59) {
          err.target = "Minutes must be between 0 and 59.";
        } else if (daysVal === 0 && hoursVal === 0 && minsVal === 0) {
          err.target = "Total target duration must be greater than 0 minutes.";
        }
      }
    } else {
      const valStr = target.toString().trim();
      if (!valStr) {
        err.target = "Target Value is required.";
      } else {
        const val = Number(target);
        if (isNaN(val)) {
          err.target = "Target Value must be a valid number.";
        } else if (unit === "/ 5") {
          if (val < 1 || val > 5) {
            err.target = "OPCR Timeliness Score must be between 1 and 5.";
          }
        } else if (val < 1 || val > 100) {
          err.target = "Failed to save KPI. Target value for percentage-based KPIs must be between 1 and 100.";
        }
      }
    }

    // Uniqueness validation: A service cannot have more than one active KPI of the same category
    if (serviceId) {
      const isDuplicate = kpis.some(k =>
        k.service_id === serviceId &&
        k.category === category &&
        k.active &&
        k.id !== editingKpi?.id
      );
      if (isDuplicate) {
        err.serviceId = `An active KPI Target with category "${category}" already exists for the selected Service Charter.`;
      }
    }

    // Uniqueness validation: Enforce [KPI Name + Service Mode] compound unique check
    if (name.trim() && serviceId) {
      const targetService = services.find(s => s.id === serviceId);
      const targetClass = targetService?.classification ? targetService.classification.trim().toLowerCase() : "";

      const isNameDuplicate = kpis.some(k => {
        if (!k.active || k.id === editingKpi?.id) return false;
        const currentName = (k.name || k.title || "").trim().toLowerCase();
        if (currentName !== name.trim().toLowerCase()) return false;
        const kService = services.find(s => s.id === k.service_id);
        const kClass = kService?.classification ? kService.classification.trim().toLowerCase() : "";
        return kClass === targetClass;
      });
      if (isNameDuplicate) {
        err.name = "A KPI with this name and service mode already exists.";
      }
    }

    if (Object.keys(err).length > 0) {
      setErrors(err);
      triggerSnackbar("Please resolve the validation errors before saving.", "error");
      return;
    }

    let backendCategory = "EFFICIENCY";
    if (category === "Timeliness") backendCategory = "COMPLIANCE";
    else if (category === "Quality") backendCategory = "CUSTOMER";

    let backendUnit = "COUNT";
    let finalTargetValue = 0;

    if (category === "Quality") {
      backendUnit = "PERCENT";
      finalTargetValue = Number(target);
    } else if (unit === "/ 5") {
      backendUnit = "/ 5";
      finalTargetValue = Number(target);
    } else {
      backendUnit = unit === " Days" ? "DAYS" : "COUNT";
      const d = Number(targetDays) || 0;
      const h = Number(targetHours) || 0;
      const m = Number(targetMins) || 0;
      finalTargetValue = d * 1440 + h * 60 + m;
    }

    const payload = {
      name,
      category: backendCategory,
      target_value: finalTargetValue,
      unit: backendUnit,
      service_id: serviceId || null,
      is_active: editingKpi ? editingKpi.active : true,
    };

    try {
      if (editingKpi) {
        await updateKpi(editingKpi.id, payload);
        setResultModal({
          show: true,
          type: "success",
          title: "KPI Target Updated!",
          message: `The KPI Target for "${name}" has been successfully updated.`,
        });
      } else {
        await createKpi(payload);
        setResultModal({
          show: true,
          type: "success",
          title: "KPI Target Added!",
          message: `The new KPI Target "${name}" has been successfully created.`,
        });
      }
      closeModal();
    } catch (err) {
      console.error(err);
      setResultModal({
        show: true,
        type: "error",
        title: "Operation Failed",
        message: err.message || (category === "Quality" ? "Failed to save KPI. Target value for percentage-based KPIs must be between 1 and 100." : "Failed to save KPI Target. Please try again."),
      });
    }
  };

  const handleToggleActive = async (id, kName, newStatus) => {
    try {
      await updateKpi(id, { is_active: newStatus });
      setResultModal({
        show: true,
        type: "success",
        title: newStatus ? "KPI Target Activated!" : "KPI Target Deactivated!",
        message: newStatus
          ? `"${kName}" is now active and will be included in performance audits and scoring.`
          : `"${kName}" has been deactivated and excluded from audits, scores, and Dashboard charts.`,
      });
    } catch (err) {
      console.error(err);
      setResultModal({
        show: true,
        type: "error",
        title: "Operation Failed",
        message: err.message || "Failed to update KPI Target status. Please try again.",
      });
    }
  };

  // Client-side Filters
  const filteredKpis = kpis.filter(k => {
    // Office scope: Check the office of the linked service
    const linkedService = services.find(s => s.id === k.service_id);
    const rawOffice = linkedService?.office || linkedService?.responsibleUnit || k.office || k.sub_office;
    if (linkedService && !isInScope(rawOffice, activeUser?.office, permissions)) {
      return false;
    }

    const isTabMatch = activeTab === 0 ? k.active : !k.active;
    if (!isTabMatch) return false;

    const kpiTitle = (k.name || k.title || "").toLowerCase();
    const q = (searchQuery || "").toLowerCase();
    const matchesSearch = kpiTitle.includes(q) ||
      (linkedService?.name || "").toLowerCase().includes(q);
    const matchesCategory = !categoryFilter || k.category === categoryFilter;

    const officeCode = getOfficeBadge(rawOffice).label;
    const matchesOffice = !officeFilter || officeCode === officeFilter;

    return matchesSearch && matchesCategory && matchesOffice;
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const showPagination = filteredKpis.length > rowsPerPage || currentPage > 1;
  const totalPages = Math.ceil(filteredKpis.length / rowsPerPage) || 1;
  const paginatedKpis = filteredKpis.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handlePageChange = (event, page) => {
    setCurrentPage(page);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, bgcolor: '#F8FAFC', minHeight: '100vh' }}>
      {/* Top Header */}
      <PageHeader breadcrumb="KPI Standards" title="Key Performance Indicators (KPIs) Target" subtitle="Define and manage KPI targets linked to your office services." />

      {/* Read-Only Notice for non-write roles */}
      {!canWriteKpi && (
        <Alert
          icon={<LockOutlinedIcon fontSize="inherit" />}
          severity="info"
          sx={{
            mb: 3,
            borderRadius: '8px',
            bgcolor: '#F0F9FF',
            color: '#0369A1',
            border: '1px solid #BAE6FD',
            fontWeight: 500,
            fontSize: '0.875rem',
            '& .MuiAlert-icon': { color: '#0369A1' }
          }}
        >
          KPI standards are managed by the Planning Officer. You have <strong>read-only</strong> access to this page.
        </Alert>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(e, val) => {
          setActiveTab(val);
          setCurrentPage(1);
        }}
        textColor="primary"
        indicatorColor="primary"
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
      >
        <Tab label="KPI Standards" sx={{ fontWeight: 700 }} />
        <Tab label="Inactive KPI Standards" sx={{ fontWeight: 700 }} />
      </Tabs>

      {/* Filters Card */}
      <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, flexWrap: 'wrap', alignItems: 'flex-end', mb: 3 }}>
          
          {/* Search Field */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: { xs: '100%', sm: 240 } }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                      <SearchIcon sx={{ color: '#94A3B8', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                width: '100%',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  height: '40px',
                  fontSize: '0.875rem',
                  color: '#1E293B',
                  '& fieldset': { borderColor: '#CBD5E1' },
                  '&:hover fieldset': { borderColor: '#94A3B8' },
                  '&.Mui-focused fieldset': { borderColor: '#64748B', borderWidth: '1px' },
                }
              }}
            />
          </Box>

          {/* Office Field */}
          {permissions?.canSeeOtherOffices && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: { xs: 'calc(50% - 6px)', sm: 180 } }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Office
              </Typography>
              <TextField
                select
                size="small"
                value={officeFilter}
                onChange={(e) => {
                  setOfficeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                SelectProps={{ displayEmpty: true }}
                sx={{
                  width: '100%',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    height: '40px',
                    fontSize: '0.875rem',
                    color: '#1E293B',
                    '& fieldset': { borderColor: '#CBD5E1' },
                    '&:hover fieldset': { borderColor: '#94A3B8' },
                    '&.Mui-focused fieldset': { borderColor: '#64748B', borderWidth: '1px' },
                  }
                }}
              >
                <MenuItem value="">All Offices</MenuItem>
                <MenuItem value="ADMIN">ADMIN</MenuItem>
                <MenuItem value="ACAD">ACAD</MenuItem>
                <MenuItem value="OSAS">OSAS</MenuItem>
              </TextField>
            </Box>
          )}

          {/* Category Field */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: { xs: permissions?.canSeeOtherOffices ? 'calc(50% - 6px)' : '100%', sm: 180 } }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Category
            </Typography>
            <TextField
              select
              size="small"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              SelectProps={{ displayEmpty: true }}
              sx={{
                width: '100%',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  height: '40px',
                  fontSize: '0.875rem',
                  color: '#1E293B',
                  '& fieldset': { borderColor: '#CBD5E1' },
                  '&:hover fieldset': { borderColor: '#94A3B8' },
                  '&.Mui-focused fieldset': { borderColor: '#64748B', borderWidth: '1px' },
                }
              }}
            >
              <MenuItem value="">All Categories</MenuItem>
              <MenuItem value="Timeliness">Timeliness</MenuItem>
              <MenuItem value="Quality">Quality</MenuItem>
              <MenuItem value="Efficiency">Efficiency</MenuItem>
            </TextField>
          </Box>

          {/* Reset Filters */}
          {(searchQuery || categoryFilter || officeFilter) && (
            <Button
              variant="outlined"
              onClick={() => {
                setSearchQuery("");
                setCategoryFilter("");
                setOfficeFilter("");
                setCurrentPage(1);
              }}
              sx={{
                height: '38px',
                textTransform: 'none',
                borderColor: '#E2E8F0',
                color: '#475569',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.875rem',
                '&:hover': {
                  borderColor: '#CBD5E1',
                  backgroundColor: '#F8FAFC',
                }
              }}
            >
              Reset Filters
            </Button>
          )}

          {/* Add KPI Target Button */}
          {canWriteKpi && (
            <Button
              variant="contained"
              startIcon={<AddIcon sx={{ fontSize: 20 }} />}
              onClick={handleOpenAdd}
              sx={{
                ml: { xs: 0, sm: 'auto' },
                width: { xs: '100%', sm: 'auto' },
                height: '40px',
                bgcolor: '#580000',
                color: '#ffffff',
                '&:hover': {
                  bgcolor: '#700000',
                  boxShadow: '0 4px 12px rgba(88, 0, 0, 0.25)',
                },
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'none',
                px: 2.5,
                boxShadow: '0 2px 4px rgba(88, 0, 0, 0.16)',
                transition: 'all 0.2s ease',
              }}
            >
              Add KPI Target
            </Button>
          )}
      </Box>

      {/* Table Container */}
      <TableContainer component={Paper} sx={{ borderRadius: "8px", border: '1px solid #E2E8F0', mb: 3, boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#580000', '& .MuiTableCell-root': { py: 1.5, whiteSpace: 'nowrap' } }}>
              {permissions?.canSeeOtherOffices && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', width: 90 }}>OFFICE</TableCell>
              )}
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', width: '250px' }}>KPI NAME</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>CATEGORY</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>TARGET VALUE</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>LINKED SERVICE</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>SERVICE MODE</TableCell>
              {canWriteKpi && <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', width: 140 }}>ACTIONS</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedKpis.length > 0 ? (
              paginatedKpis.map((kpi) => {
                const svc = services.find(s => s.id === kpi.service_id);
                return (
                  <TableRow
                    key={kpi.id}
                    hover
                    sx={{
                      opacity: kpi.active ? 1 : 0.6,
                      '& .MuiTableCell-root': {
                        py: 1.5,
                        borderBottom: '1px solid #CBD5E1',
                        boxShadow: 'inset 0 -1.5px 0 0 rgba(0, 0, 0, 0.04)'
                      }
                    }}
                  >
                    {permissions?.canSeeOtherOffices && (
                      <TableCell>
                        {(() => {
                          const rawOffice = svc?.office || svc?.responsibleUnit || kpi.office || kpi.sub_office;
                          const ob = getOfficeBadge(rawOffice);
                          if (ob.label === '—') return <Typography color="text.disabled">—</Typography>;
                          return (
                            <Tooltip title={ob.full} arrow placement="top">
                              <Chip
                                label={ob.label}
                                size="small"
                                sx={{
                                  fontWeight: 800,
                                  fontSize: '0.7rem',
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
                    <TableCell sx={{ minWidth: 220, maxWidth: 360 }}>
                      <ExpandableText text={kpi.name} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={kpi.category}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          ...(kpi.category === "Timeliness" && { bgcolor: '#EFF6FF', color: '#2563EB', border: '1px solid rgba(37, 99, 235, 0.15)' }),
                          ...(kpi.category === "Quality" && { bgcolor: '#FFFBEB', color: '#D97706', border: '1px solid rgba(217, 119, 6, 0.15)' }),
                          ...(kpi.category === "Efficiency" && { bgcolor: '#ECFDF5', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.15)' })
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "text.primary", fontSize: '0.875rem' }}>
                      {kpi.category === "Quality" ? `${Number(kpi.target_value)}%` :
                        kpi.unit === "/ 5" ? `${Number(kpi.target_value)} / 5` :
                          formatDuration(kpi.target_value)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontWeight: 500, minWidth: 200, maxWidth: 320 }}>
                      <ExpandableText text={svc?.name || "Unlinked Service"} />
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const modesList = Array.isArray(svc?.modes) && svc.modes.length > 0
                          ? svc.modes.map(m => typeof m === 'object' ? (m.name || m.id) : m)
                          : (svc?.service_mode ? [svc.service_mode] : []);

                        if (modesList.length === 0) {
                          return <Typography color="text.disabled">—</Typography>;
                        }

                        return (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                            {modesList.map((mName, idx) => (
                              <Chip
                                key={idx}
                                label={mName}
                                size="small"
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  bgcolor: '#FDF2F2',
                                  color: '#800000',
                                  border: '1px solid rgba(128, 0, 0, 0.2)',
                                  maxWidth: 220,
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
                      })()}
                    </TableCell>
                    {canWriteKpi && (
                    <TableCell align="center">
                      <Tooltip title="Actions" arrow>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, kpi)}
                          sx={{
                            '&:hover': {
                              bgcolor: 'rgba(0, 0, 0, 0.04)',
                            },
                            width: 32,
                            height: 32
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
                <TableCell colSpan={5 + (permissions?.canSeeOtherOffices ? 1 : 0) + (canWriteKpi ? 1 : 0)} align="center" sx={{ py: 5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    {(searchQuery || categoryFilter || officeFilter)
                      ? 'No KPI targets found matching your active filter criteria.'
                      : !canWriteKpi
                        ? 'No KPI targets configured for your office. Contact your Planning Officer.'
                        : 'No KPI targets found. Click "+ Add KPI Target" to get started.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, flexWrap: 'wrap', gap: 2, pr: { xs: 0, sm: 10 }, pb: 4 }}>
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
        {showPagination && totalPages > 1 && (
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            shape="rounded"
          />
        )}
      </Box>

      {/* ── Add / Edit KPI Modal ── */}
      <KPIModal
        open={!!(showAdd || editingKpi)}
        editingKpi={editingKpi}
        services={services}
        name={name} setName={setName}
        category={category} setCategory={setCategory}
        target={target} setTarget={setTarget}
        targetDays={targetDays} setTargetDays={setTargetDays}
        targetHours={targetHours} setTargetHours={setTargetHours}
        targetMins={targetMins} setTargetMins={setTargetMins}
        unit={unit} setUnit={setUnit}
        serviceId={serviceId} setServiceId={setServiceId}
        errors={errors} setErrors={setErrors}
        onSave={handleSave}
        onClose={closeModal}
      />

      {/* ── Deactivate KPI Confirmation ── */}
      <ToggleStatusModal
        open={!!deactivatingKpi}
        isActivate={false}
        entityLabel="KPI Target"
        itemName={deactivatingKpi?.name || ''}
        bodyExtra="Deactivating this target excludes it from current performance audits, scores, and active charts in the Dashboard."
        onConfirm={async () => {
          const kpi = deactivatingKpi;
          setDeactivatingKpi(null);
          await handleToggleActive(kpi.id, kpi.name, false);
        }}
        onCancel={() => setDeactivatingKpi(null)}
      />

      {/* ── Activate KPI Confirmation ── */}
      <ToggleStatusModal
        open={!!activatingKpi}
        isActivate={true}
        entityLabel="KPI Target"
        itemName={activatingKpi?.name || ''}
        bodyExtra="Activating this KPI will include it in active audits, evaluations, and metrics computation for this period."
        onConfirm={async () => {
          const kpi = activatingKpi;
          setActivatingKpi(null);
          await handleToggleActive(kpi.id, kpi.name, true);
        }}
        onCancel={() => setActivatingKpi(null)}
      />

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        TransitionProps={{
          onExited: () => setSelectedKpi(null)
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            elevation: 2,
            sx: {
              minWidth: 180,
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
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Edit KPI Target</Typography>
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        {selectedKpi?.active ? (
          <MenuItem onClick={handleToggleActiveClick}>
            <BlockIcon sx={{ mr: 1.5, color: '#d32f2f', fontSize: 18 }} />
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Deactivate Target</Typography>
          </MenuItem>
        ) : (
          <MenuItem onClick={handleToggleActiveClick}>
            <CheckCircleIcon sx={{ mr: 1.5, color: '#2e7d32', fontSize: 18 }} />
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Activate Target</Typography>
          </MenuItem>
        )}
      </Menu>

      {/* Snackbar alerts */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Result Modal Feedback */}
      {resultModal.show && (
        <ResultModal
          type={resultModal.type}
          title={resultModal.title}
          message={resultModal.message}
          onClose={() => setResultModal(prev => ({ ...prev, show: false }))}
        />
      )}
    </Box>
  );
}
