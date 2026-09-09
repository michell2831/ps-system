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
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Pagination,
  Select,
  Menu,
  Divider,
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';
import FlagIcon from '@mui/icons-material/Flag';
import FlagOffIcon from '@mui/icons-material/FlagOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';


import PageHeader from "../components/PageHeader";
import AddServiceModal from "../modals/AddServiceModal";
import IntakeFieldBuilderModal from "../modals/IntakeFieldBuilderModal";
import ResultModal from "../modals/ResultModal";
import NaFlagModal from "../modals/NaFlagModal";
import ToggleStatusModal from "../modals/ToggleStatusModal";

import { useAppStore } from "../store/useAppStore";
import { api } from "../services/api";
import { isInScope } from "../services/permissions";

const parseSlaTarget = (targetStr) => {
  if (!targetStr) return { days: 0, hours: 0, minutes: 0 };
  const matchDays = targetStr.match(/(\d+)\s*d/i) || targetStr.match(/(\d+)\s*Day/i);
  const matchHours = targetStr.match(/(\d+)\s*h/i) || targetStr.match(/(\d+)\s*Hour/i);
  const matchMins = targetStr.match(/(\d+)\s*m/i) || targetStr.match(/(\d+)\s*Min/i) || targetStr.match(/(\d+)\s*Minute/i);
  return {
    days: matchDays ? parseInt(matchDays[1]) : 0,
    hours: matchHours ? parseInt(matchHours[1]) : 0,
    minutes: matchMins ? parseInt(matchMins[1]) : 0
  };
};

const mapWithReferralToBackend = (val) => {
  if (!val) return 'Without';
  const lower = val.toLowerCase();
  if (lower === 'with' || lower === 'with referral') return 'With';
  if (lower === 'without' || lower === 'without referral') return 'Without';
  if (lower === 'n/a' || lower === 'not applicable') return 'N/A';
  return 'Without';
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

const renderDateTimeCell = (dateStr) => {
  if (!dateStr || dateStr === '—') return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hh = String(hours).padStart(2, '0');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.8125rem' }}>{`${mm}/${dd}/${yyyy}`}</span>
      <span style={{ color: '#94A3B8', fontSize: '0.75rem', fontWeight: 500 }}>{`${hh}:${minutes} ${ampm}`}</span>
    </Box>
  );
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

export default function ServiceCatalogue() {
  const {
    services,
    fetchServices,
    createService,
    updateService,
    activateService,
    deactivateService,
    archiveService,
    updateServiceIntakeFieldsLocal,
    kpis,
    fetchKpis,
    commitments,
    fetchCommitments,
    permissions,
    activeUser,
  } = useAppStore();

  const [showAdd, setShowAdd] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const [activating, setActivating] = useState(null);
  const [fieldsService, setFieldsService] = useState(null);
  const [flaggingService, setFlaggingService] = useState(null);
  const [addingServiceData, setAddingServiceData] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [resultModal, setResultModal] = useState(null); // { type, title, message }
  const [activeTab, setActiveTab] = useState(0); // 0: services, 1: archived

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  const handleMenuOpen = (event, svc) => {
    setAnchorEl(event.currentTarget);
    setSelectedService(svc);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    if (selectedService) {
      setEditingService(selectedService);
    }
    handleMenuClose();
  };

  const handleManageFieldsClick = async () => {
    if (!selectedService) return;
    const svc = selectedService;
    handleMenuClose();
    try {
      const res = await api.getIntakeFields(svc.id);
      const intakeFields = (res || []).map(f => ({
        id: f.id,
        label: f.label,
        type: f.field_type === 'BOOLEAN' || f.field_type === 'CHECKBOX' ? 'Checkbox' : f.field_type.charAt(0).toUpperCase() + f.field_type.slice(1).toLowerCase(),
        required: f.is_required,
        options: f.dropdown_options || [],
        displayOrder: f.display_order
      }));
      setFieldsService({ ...svc, isNew: false, intakeFields: intakeFields.sort((a, b) => a.displayOrder - b.displayOrder) });
    } catch (err) {
      console.error("Failed to load intake fields", err);
      triggerSnackbar("Failed to load intake fields", "error");
      setFieldsService({ ...svc, isNew: false, intakeFields: [] });
    }
  };

  const handleUnflagClick = () => {
    if (selectedService) {
      handleUnflag(selectedService);
    }
    handleMenuClose();
  };

  const handleFlagClick = () => {
    if (selectedService) {
      setFlaggingService(selectedService);
    }
    handleMenuClose();
  };

  const handleDeactivateClick = () => {
    if (selectedService) {
      setDeactivating(selectedService);
    }
    handleMenuClose();
  };

  const handleActivateClick = () => {
    if (selectedService) {
      setActivating(selectedService);
    }
    handleMenuClose();
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [officeFilter, setOfficeFilter] = useState("");

  const triggerSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  useEffect(() => {
    fetchServices();
    useAppStore.getState().fetchPeriods();
    fetchKpis();
    fetchCommitments();
  }, []);

  const activePeriod = useAppStore.getState().periods.find(p => p.status === "Active" || p.status === "Open");
  // Derive write permission and office scope from the permissions object
  const canWrite = permissions?.canWriteServices || false;
  const canAddService = permissions?.canSeeAddServiceBtn || false;

  const handleToggle = async (id) => {
    const svc = services.find(s => s.id === id);
    if (!svc) return;
    if (svc.active) {
      setDeactivating(svc);
      return;
    }
    try {
      await activateService(id);
      triggerSnackbar(`Service '${svc.name}' activated successfully!`, "success");
    } catch (err) {
      console.error(err);
      triggerSnackbar(err.message || "Failed to activate service", "error");
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivating) return;
    const serviceName = deactivating.name;
    try {
      await deactivateService(deactivating.id);
      setDeactivating(null);
      setResultModal({
        type: "success",
        title: "Service Deactivated",
        message: `The service "${serviceName}" has been successfully deactivated and is now hidden from transaction logging.`
      });
    } catch (err) {
      console.error(err);
      setDeactivating(null);
      setResultModal({
        type: "error",
        title: "Deactivation Failed",
        message: err.message || `Failed to deactivate the service "${serviceName}".`
      });
    }
  };

  const confirmActivate = async () => {
    if (!activating) return;
    const serviceName = activating.name;
    try {
      await api.activateService(activating.id);
      setActivating(null);
      await fetchServices();
      setResultModal({
        type: "success",
        title: "Service Activated",
        message: `The service "${serviceName}" has been successfully activated and is now available for transaction logging.`
      });
    } catch (err) {
      console.error(err);
      setActivating(null);
      setResultModal({
        type: "error",
        title: "Activation Failed",
        message: err.message || `Failed to activate the service "${serviceName}".`
      });
    }
  };

  const handleUnflag = async (svc) => {
    const flagId = svc.naFlags?.[0]?.id;
    if (!flagId) return;
    try {
      await api.deleteNaFlag(svc.id, flagId);
      triggerSnackbar(`Service '${svc.name}' unflagged successfully!`, "success");
      await fetchServices();
    } catch (err) {
      console.error(err);
      triggerSnackbar(err.message || "Failed to unflag service", "error");
    }
  };

  const filteredData = services.filter(svc => {
    // Office scope: Staff and Admin only see services belonging to their own office
    if (!isInScope(svc.office || svc.responsibleUnit, activeUser?.office, permissions)) return false;

    const matchesSearch = svc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      svc.id.toString().includes(searchQuery.toLowerCase());

    const matchesType = !typeFilter || getArtaClassification(svc) === typeFilter;

    const officeCode = getOfficeBadge(svc.office || svc.responsibleUnit).label;
    const matchesOffice = !officeFilter || officeCode === officeFilter;

    let matchesStatus = true;
    if (activeTab === 1) {
      matchesStatus = !svc.active;
    } else {
      matchesStatus = svc.active;
    }

    return matchesSearch && matchesType && matchesOffice && matchesStatus;
  });

  const [rowsPerPage, setRowsPerPage] = useState(10);
  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handlePageChange = (event, page) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, bgcolor: '#F8FAFC', minHeight: '100vh' }}>
      {/* Top Header */}
      <PageHeader breadcrumb="Service" title="Service Catalogue" subtitle="Manage and configure the services offered by your office." />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(e, val) => {
          setActiveTab(val);
          setStatusFilter(val === 1 ? "inactive" : "");
          setCurrentPage(1);
        }}
        textColor="primary"
        indicatorColor="primary"
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
      >
        <Tab label="Active Services" sx={{ fontWeight: 700 }} />
        <Tab label="Inactive Services" sx={{ fontWeight: 700 }} />
      </Tabs>

      {/* Filters card */}
      <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, flexWrap: 'wrap', alignItems: 'flex-end', mb: 3 }}>

        {/* Search Field */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: { xs: '100%', sm: 240 } }}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Search Service
          </Typography>
          <TextField
            placeholder="Search..."
            size="small"
            value={searchQuery}
            onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
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

        {/* Classification Field */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: { xs: permissions?.canSeeOtherOffices ? 'calc(50% - 6px)' : '100%', sm: 180 } }}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Classification
          </Typography>
          <TextField
            select
            size="small"
            value={typeFilter}
            onChange={(e) => handleFilterChange(setTypeFilter, e.target.value)}
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
            <MenuItem value="">All Classifications</MenuItem>
            <MenuItem value="Simple">Simple</MenuItem>
            <MenuItem value="Complex">Complex</MenuItem>
            <MenuItem value="Highly Technical">Highly Technical</MenuItem>
          </TextField>
        </Box>

        {/* Office Filter Field */}
        {permissions?.canSeeOtherOffices && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: { xs: 'calc(50% - 6px)', sm: 180 } }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Office
            </Typography>
            <TextField
              select
              size="small"
              value={officeFilter}
              onChange={(e) => handleFilterChange(setOfficeFilter, e.target.value)}
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

        {/* Reset Filters */}
        {(searchQuery || typeFilter || officeFilter) && (
          <Button
            variant="outlined"
            onClick={() => {
              setSearchQuery("");
              setTypeFilter("");
              setOfficeFilter("");
              setCurrentPage(1);
            }}
            sx={{
              height: '40px',
              textTransform: 'none',
              borderColor: '#E2E8F0',
              color: '#475569',
              borderRadius: '8px',
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

        {/* Add Service Button */}
        {canAddService && (
          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 20 }} />}
            onClick={() => setShowAdd(true)}
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
            Add Service
          </Button>
        )}
      </Box>

      {/* Table scroller */}
      <TableContainer component={Paper} sx={{ borderRadius: "8px", border: '1px solid #E2E8F0', mb: 3, boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
        <Table sx={{ minWidth: 980 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: '#580000', '& .MuiTableCell-root': { py: 1.5, whiteSpace: 'nowrap' } }}>
              {permissions?.canSeeOtherOffices && (
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', width: 90 }}>OFFICE</TableCell>
              )}
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', width: 280 }}>SERVICE NAME</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', width: 180 }}>SERVICE MODE</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', width: 130 }}>CLASSIFICATION</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', width: 110 }}>SLA TARGET</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', width: 90 }}>N/A FLAG</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', width: 130 }}>LAST UPDATED</TableCell>
              {canWrite && <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', width: 100 }}>ACTIONS</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((svc) => (
                <TableRow
                  key={svc.id}
                  hover
                  sx={{
                    opacity: svc.active ? 1 : 0.65,
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
                        const ob = getOfficeBadge(svc.office || svc.responsibleUnit);
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
                  <TableCell sx={{ minWidth: 260, maxWidth: 380 }}>
                    <ExpandableText text={svc.name} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 220 }}>
                    {(() => {
                      const modesList = Array.isArray(svc.modes) && svc.modes.length > 0
                        ? svc.modes.map(m => typeof m === 'object' ? (m.name || m.id) : m)
                        : (svc.service_mode ? [svc.service_mode] : []);

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
                  <TableCell>
                    {(() => {
                      const artaClass = getArtaClassification(svc);
                      return (
                        <Chip
                          label={artaClass}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            ...(artaClass === "Highly Technical" && { bgcolor: '#FEF2F2', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.15)' }),
                            ...(artaClass === "Complex" && { bgcolor: '#FFFBEB', color: '#D97706', border: '1px solid rgba(217, 119, 6, 0.15)' }),
                            ...(artaClass === "Simple" && { bgcolor: '#ECFDF5', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.15)' })
                          }}
                        />
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.8125rem' }}>
                      {svc.slaTarget || svc.sla}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {svc.naFlag ? (
                      <Tooltip title={svc.naFlags?.[0]?.reason || "Service flagged as N/A for this period."} arrow placement="top">
                        <Chip label="N/A" size="small" variant="outlined" sx={{ fontWeight: 700, color: 'text.secondary', bgcolor: '#F1F5F9', cursor: 'help' }} />
                      </Tooltip>
                    ) : (
                      <Typography color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {renderDateTimeCell(svc.updated_at || svc.lastUpdated)}
                  </TableCell>
                  {canWrite && (
                    <TableCell align="center">
                      <Tooltip title="Actions" arrow>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, svc)}
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6 + (permissions?.canSeeOtherOffices ? 1 : 0) + (canWrite ? 1 : 0)} align="center" sx={{ py: 5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    No services found matching your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Container */}
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
        {totalPages > 1 && (
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            shape="rounded"
          />
        )}
      </Box>

      {/* Modals */}
      {showAdd && (
        <AddServiceModal
          service={addingServiceData}
          onClose={() => {
            setShowAdd(false);
            setAddingServiceData(null);
          }}
          onNext={(newSvc) => {
            if (!newSvc.serviceName || !newSvc.serviceName.trim()) {
              setResultModal({
                type: "error",
                title: "Failed to Add Service",
                message: "Service name is required.",
              });
              return;
            }

            // Client-side uniqueness check for [Name + Service Mode]
            const nameLower = newSvc.serviceName.trim().toLowerCase();
            const classLower = newSvc.classification ? newSvc.classification.trim().toLowerCase() : "";
            const isDuplicate = services.some(s =>
              !s.archived &&
              s.name.trim().toLowerCase() === nameLower &&
              (s.classification ? s.classification.trim().toLowerCase() : "") === classLower
            );
            if (isDuplicate) {
              setResultModal({
                type: "error",
                title: "Failed to Add Service",
                message: "Failed to save. A service with this name and service mode already exists in your office.",
              });
              return;
            }

            const currentWizardState = {
              isNew: true,
              name: newSvc.serviceName,
              classification: newSvc.classification,
              slaTarget: newSvc.slaTarget,
              responsibleUnit: newSvc.responsibleUnit,
              active: newSvc.active,
              withReferral: newSvc.withReferral,
              intakeDocuments: newSvc.intakeDocuments,
              stepsTimeline: newSvc.stepsTimeline,
              expectedOutput: newSvc.expectedOutput,
              intakeFields: addingServiceData?.intakeFields || []
            };

            // Close the Add form and open Intake Field Builder with local unsaved service metadata
            setAddingServiceData(currentWizardState);
            setShowAdd(false);
            setFieldsService(currentWizardState);
          }}
        />
      )}

      {editingService && (
        <AddServiceModal
          service={editingService}
          onClose={() => setEditingService(null)}
          onEdit={async (updatedSvc) => {
            try {
              // Client-side uniqueness check for [Name + Service Mode]
              const nameLower = updatedSvc.name.trim().toLowerCase();
              const classLower = updatedSvc.classification ? updatedSvc.classification.trim().toLowerCase() : "";
              const isDuplicate = services.some(s =>
                !s.archived &&
                s.id !== updatedSvc.id &&
                s.name.trim().toLowerCase() === nameLower &&
                (s.classification ? s.classification.trim().toLowerCase() : "") === classLower
              );
              if (isDuplicate) {
                triggerSnackbar("Failed to save. A service with this name and service mode already exists in your office.", "error");
                return;
              }

              const { days, hours, minutes } = parseSlaTarget(updatedSvc.slaTarget);
              let slaValue = 0;
              let slaUnit = "Days";
              if (hours === 0 && minutes === 0) {
                slaValue = days;
                slaUnit = "Days";
              } else {
                slaValue = days * 1440 + hours * 60 + minutes;
                slaUnit = "Minutes";
              }

              const payload = {
                name: updatedSvc.name,
                classification: updatedSvc.classification,
                sla_target_value: slaValue,
                sla_target_unit: slaUnit,
                responsible_unit: updatedSvc.responsibleUnit,
                with_referral: mapWithReferralToBackend(updatedSvc.withReferral),
                required_documents: updatedSvc.intakeDocuments ? updatedSvc.intakeDocuments.split("\n").filter(Boolean) : [],
                processing_steps: Array.isArray(updatedSvc.processing_steps) && updatedSvc.processing_steps.length > 0
                  ? updatedSvc.processing_steps
                  : (updatedSvc.stepsTimeline ? updatedSvc.stepsTimeline.split("\n").filter(Boolean) : []),
                expected_output: updatedSvc.expectedOutput,
              };

              await updateService(updatedSvc.id, payload);
              triggerSnackbar(`Service '${updatedSvc.name}' updated successfully!`, "success");
            } catch (err) {
              console.error(err);
              const isDuplicate = err.message && (err.message.includes("exists") || err.message.includes("Conflict") || err.message.includes("unique") || err.message.includes("duplicate"));
              const msg = isDuplicate
                ? "Failed to save. A service with this name and service mode already exists in your office."
                : (err.message || "Failed to update service");
              triggerSnackbar(msg, "error");
              throw err;
            }
          }}
        />
      )}

      {deactivating && (
        <ToggleStatusModal
          open={Boolean(deactivating)}
          isActivate={false}
          itemName={deactivating.name}
          entityLabel="Service"
          bodyExtra="This service will be hidden from transaction logging immediately."
          onConfirm={confirmDeactivate}
          onCancel={() => setDeactivating(null)}
        />
      )}

      {activating && (
        <ToggleStatusModal
          open={Boolean(activating)}
          isActivate={true}
          itemName={activating.name}
          entityLabel="Service"
          bodyExtra="This service will be restored to transaction logging immediately."
          onConfirm={confirmActivate}
          onCancel={() => setActivating(null)}
        />
      )}



      {fieldsService && (
        <IntakeFieldBuilderModal
          service={fieldsService}
          onClose={() => {
            setFieldsService(null);
            setAddingServiceData(null);
          }}
          onBack={(currentSvcState) => {
            setFieldsService(null);
            setAddingServiceData(currentSvcState);
            setShowAdd(true);
          }}
          onSave={async (updatedSvc) => {
            try {
              let targetServiceId = updatedSvc.id;
              let finalServiceData = { ...updatedSvc, isNew: false };

              if (updatedSvc.isNew) {
                // First, create the service catalogue record
                const { days, hours, minutes } = parseSlaTarget(updatedSvc.slaTarget);
                let slaValue = 0;
                let slaUnit = "Days";
                if (hours === 0 && minutes === 0) {
                  slaValue = days;
                  slaUnit = "Days";
                } else {
                  slaValue = days * 1440 + hours * 60 + minutes;
                  slaUnit = "Minutes";
                }

                const servicePayload = {
                  name: updatedSvc.name || updatedSvc.serviceName,
                  classification: updatedSvc.classification,
                  sla_target_value: slaValue,
                  sla_target_unit: slaUnit,
                  responsible_unit: updatedSvc.responsibleUnit,
                  with_referral: mapWithReferralToBackend(updatedSvc.withReferral),
                  required_documents: updatedSvc.intakeDocuments ? updatedSvc.intakeDocuments.split("\n").filter(Boolean) : [],
                  processing_steps: Array.isArray(updatedSvc.processing_steps) && updatedSvc.processing_steps.length > 0
                    ? updatedSvc.processing_steps
                    : (updatedSvc.stepsTimeline ? updatedSvc.stepsTimeline.split("\n").filter(Boolean) : []),
                  expected_output: updatedSvc.expectedOutput,
                };

                const createdSvc = await createService(servicePayload);
                targetServiceId = createdSvc.id;
                finalServiceData = {
                  ...updatedSvc,
                  id: createdSvc.id,
                  name: createdSvc.name,
                  isNew: false,
                };
              }

              const oldFields = updatedSvc.isNew ? [] : (fieldsService.intakeFields || []);
              const newFields = updatedSvc.intakeFields || [];
              const isNew = (id) => typeof id === 'number' || (typeof id === 'string' && id.length < 36 && !id.includes('-'));

              // 1. Delete removed fields (only for existing services)
              if (!updatedSvc.isNew) {
                const toDelete = oldFields.filter(of => !newFields.some(nf => nf.id === of.id));
                for (const f of toDelete) {
                  await api.deleteIntakeField(targetServiceId, f.id);
                }
              }

              // 2. Create or Update fields
              for (const f of newFields) {
                const dto = {
                  label: f.label,
                  field_type: f.type.toUpperCase() === 'CHECKBOX' ? 'BOOLEAN' : f.type.toUpperCase(),
                  is_required: f.required,
                  display_order: f.displayOrder,
                  dropdown_options: f.options || []
                };

                if (updatedSvc.isNew || isNew(f.id)) {
                  await api.createIntakeField(targetServiceId, dto);
                } else {
                  await api.updateIntakeField(targetServiceId, f.id, dto);
                }
              }

              updateServiceIntakeFieldsLocal(finalServiceData);
              setAddingServiceData(null); // Clear wizard state on success
              setResultModal({
                type: "success",
                title: "Success!",
                message: updatedSvc.isNew ? "Service catalogue and intake fields saved successfully!" : "Intake fields saved successfully to the database."
              });
            } catch (err) {
              console.error(err);
              const isDuplicate = err.message && (err.message.includes("exists") || err.message.includes("Conflict") || err.message.includes("unique") || err.message.includes("duplicate"));
              setResultModal({
                type: "error",
                title: updatedSvc.isNew ? "Failed to Create Service" : "Intake Fields Save Failed",
                message: isDuplicate
                  ? "Failed to save. A service with this name and service mode already exists in your office."
                  : (err.message || "Failed to save to the database.")
              });
              throw err;
            }
          }}
        />
      )}

      {flaggingService && (
        <NaFlagModal
          service={flaggingService}
          activePeriod={activePeriod}
          onClose={() => setFlaggingService(null)}
          onConfirm={async (serviceId, periodId, reason) => {
            try {
              await api.createNaFlag(serviceId, { period_id: periodId, reason });
              setFlaggingService(null);
              await fetchServices();
              setResultModal({
                type: "success",
                title: "Success",
                message: "Service successfully flagged as N/A."
              });
            } catch (err) {
              setResultModal({
                type: "error",
                title: "Failed to Flag Service",
                message: err.message || "Failed to flag service."
              });
            }
          }}
        />
      )}



      {resultModal && (
        <ResultModal
          type={resultModal.type}
          title={resultModal.title}
          message={resultModal.message}
          onClose={() => setResultModal(null)}
        />
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        TransitionProps={{
          onExited: () => setSelectedService(null)
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
        <MenuItem onClick={handleEditClick} disabled={selectedService?.archived}>
          <EditIcon sx={{ mr: 1.5, color: '#800000', fontSize: 18 }} />
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Edit Service</Typography>
        </MenuItem>

        <MenuItem onClick={handleManageFieldsClick} disabled={selectedService?.archived}>
          <DynamicFormIcon sx={{ mr: 1.5, color: '#0284c7', fontSize: 18 }} />
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Manage Fields</Typography>
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        {selectedService?.active && activePeriod && (
          selectedService.naFlag ? (
            <MenuItem onClick={handleUnflagClick}>
              <FlagIcon sx={{ mr: 1.5, color: '#ed6c02', fontSize: 18 }} />
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Unflag Service</Typography>
            </MenuItem>
          ) : (
            <MenuItem onClick={handleFlagClick}>
              <FlagOffIcon sx={{ mr: 1.5, color: '#ed6c02', fontSize: 18 }} />
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Flag as N/A</Typography>
            </MenuItem>
          )
        )}

        {selectedService?.active ? (
          <MenuItem onClick={handleDeactivateClick}>
            <BlockIcon sx={{ mr: 1.5, color: '#d32f2f', fontSize: 18 }} />
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Deactivate Service</Typography>
          </MenuItem>
        ) : (
          <MenuItem onClick={handleActivateClick}>
            <CheckCircleIcon sx={{ mr: 1.5, color: '#2e7d32', fontSize: 18 }} />
            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>Activate Service</Typography>
          </MenuItem>
        )}


      </Menu>

      {/* Snackbar notification */}
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
    </Box>
  );
}
