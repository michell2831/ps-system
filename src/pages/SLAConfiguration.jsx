import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  Button,
  Snackbar,
  Alert,
  Paper,
  Divider,
  Menu,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';

import { useAppStore } from "../store/useAppStore";
import PageHeader from "../components/PageHeader";
import ResultModal from "../modals/ResultModal";
import ConfirmModal from "../modals/ConfirmModal";
import {
  AccessTime as AccessTimeIcon,
  Error as ErrorIcon,
  History as HistoryIcon,
  CalendarMonth as CalendarMonthIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { PREDEFINED_MOCK_USERS } from "../services/auth";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const getActorDisplayName = (actorId) => {
  if (!actorId) return "Unknown User";
  if (actorId === "system-seeder") return "System Seeder";
  if (actorId === "system" || actorId === "System Admin" || actorId === "Subsystem Admin") return actorId;

  const user = PREDEFINED_MOCK_USERS.find(
    u => u.id === actorId || u.username === actorId
  );
  return user ? user.displayName : actorId;
};

const getVersionDate = (item) => {
  if (item.end_date && item.end_date instanceof Date && !isNaN(item.end_date.getTime())) {
    return item.end_date;
  }
  return item.start_date;
};

const getMonthYear = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const configSignature = (item) => {
  if (!item) return "";
  return [
    item.work_schedule_type,
    item.work_start_time,
    item.work_end_time,
    item.overdue_threshold_pct ?? 100,
    JSON.stringify(item.work_schedule_config)
  ].join('|');
};

export default function SLAConfiguration() {
  const {
    slaRules,
    fetchSlaRules,
    updateSlaRule,
    createSlaRule,
    restoreSlaVersion,
    periods,
    fetchPeriods,
    permissions,
  } = useAppStore();

  const canSeeSlaForm = permissions?.canSeeSlaForm || false;
  const canWriteSla = permissions?.canWriteSla || false;

  const [workingDays, setWorkingDays] = useState([]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [overdueThreshold, setOverdueThreshold] = useState(100);
  const [warnThreshold, setWarnThreshold] = useState(70);

  const [showConfirm, setShowConfirm] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState(null);
  const [showRestoreExistingConfirm, setShowRestoreExistingConfirm] = useState(false);
  const [matchingExistingVersion, setMatchingExistingVersion] = useState(null);
  const [resultModal, setResultModal] = useState({ show: false, type: "success", title: "", message: "" });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [activeRuleId, setActiveRuleId] = useState(null);
  const [activePeriodName, setActivePeriodName] = useState("Jan — Jun 2026 Period");
  const [history, setHistory] = useState([]);
  const [expandedVersions, setExpandedVersions] = useState({});

  const [customNames, setCustomNames] = useState(() => {
    try {
      const saved = localStorage.getItem("sla_version_names");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuItem, setMenuItem] = useState(null);
  const [renamingItem, setRenamingItem] = useState(null);
  const [newName, setNewName] = useState("");

  const handleOpenMenu = (event, item) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuItem(item);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setMenuItem(null);
  };

  const handleMenuRename = () => {
    if (menuItem) {
      setRenamingItem(menuItem);
      setNewName(customNames[configSignature(menuItem)] || "");
    }
    handleCloseMenu();
  };

  const handleSaveName = () => {
    if (!renamingItem) return;
    const sig = configSignature(renamingItem);
    const updated = {
      ...customNames,
      [sig]: newName.trim()
    };
    setCustomNames(updated);
    localStorage.setItem("sla_version_names", JSON.stringify(updated));
    setRenamingItem(null);
    setNewName("");
  };

  const toggleVersionExpand = (versionId) => {
    setExpandedVersions(prev => ({
      ...prev,
      [versionId]: !prev[versionId]
    }));
  };

  const triggerSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const formatDaysList = (type, config) => {
    if (type === "WEEKDAYS") return "Mon-Fri";
    if (type === "MONDAY_TO_SATURDAY") return "Mon-Sat";
    if (type === "CUSTOM" && Array.isArray(config)) {
      const activeDays = config.filter(c => c.is_working).map(c => c.day.slice(0, 3));
      return activeDays.join(", ");
    }
    return "Mon-Fri";
  };

  const format12Hour = (timeStr) => {
    if (!timeStr) return "08:00 AM";
    const [h, m] = timeStr.split(":");
    const hrs = parseInt(h);
    const ampm = hrs >= 12 ? "PM" : "AM";
    const displayHrs = hrs % 12 || 12;
    return `${displayHrs.toString().padStart(2, "0")}:${m} ${ampm}`;
  };

  const loadData = async () => {
    try {
      // 1. Fetch periods to display active period name
      await fetchPeriods();
      const active = periods.find(p => p.status === "Active" || p.status === "Open");
      if (active) {
        setActivePeriodName(active.name);
      }

      // 2. Fetch active rules & versions
      const res = await fetchSlaRules();
      if (res && res.length > 0) {
        const activeRule = res.find(r => r.is_active === true) || res[0];
        if (activeRule) {
          setActiveRuleId(activeRule.id);
          setOverdueThreshold(100);
          setStartTime(activeRule.work_start_time.slice(0, 5));
          setEndTime(activeRule.work_end_time.slice(0, 5));
          setWarnThreshold(activeRule.warn_threshold_pct ?? 70);

          // workingDays is intentionally left empty as requested by the user,
          // so it forces them to select it manually every time.

          const sortedVersions = Array.isArray(activeRule.versions)
            ? [...activeRule.versions].sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
            : [];

          const list = [];

          const activeStart = sortedVersions.length > 0
            ? new Date(sortedVersions[0].changed_at)
            : new Date(activeRule.created_at);

          list.push({
            id: activeRule.id,
            start_date: activeStart,
            end_date: "Present",
            timestamp: activeStart.toLocaleString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              hour12: true
            }),
            actor: activeRule.created_by || "System Admin",
            working_days: formatDaysList(activeRule.work_schedule_type, activeRule.work_schedule_config),
            working_hours: `${format12Hour(activeRule.work_start_time)} - ${format12Hour(activeRule.work_end_time)}`,
            overdue_threshold: "100%",
            is_active_rule: true,
            work_schedule_type: activeRule.work_schedule_type,
            work_schedule_config: activeRule.work_schedule_config,
            work_start_time: activeRule.work_start_time,
            work_end_time: activeRule.work_end_time,
            overdue_threshold_pct: activeRule.overdue_threshold_pct ?? 100
          });

          sortedVersions.forEach((v, vIndex) => {
            const vStart = (vIndex === sortedVersions.length - 1)
              ? new Date(activeRule.created_at)
              : new Date(sortedVersions[vIndex + 1].changed_at);

            const vEnd = new Date(v.changed_at);

            list.push({
              id: v.id,
              start_date: vStart,
              end_date: vEnd,
              timestamp: vEnd.toLocaleString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true
              }),
              actor: v.changed_by || "Subsystem Admin",
              working_days: formatDaysList(v.work_schedule_type, v.work_schedule_config),
              working_hours: `${format12Hour(v.work_start_time)} - ${format12Hour(v.work_end_time)}`,
              overdue_threshold: "100%",
              is_active_rule: false,
              work_schedule_type: v.work_schedule_type,
              work_schedule_config: v.work_schedule_config,
              work_start_time: v.work_start_time,
              work_end_time: v.work_end_time,
              overdue_threshold_pct: v.overdue_threshold_pct ?? 100
            });
          });

          const chronoList = [...list].reverse();

          const configsEqual = (a, b) => {
            if (a.work_schedule_type !== b.work_schedule_type) return false;
            if (a.work_start_time !== b.work_start_time) return false;
            if (a.work_end_time !== b.work_end_time) return false;
            if (a.overdue_threshold_pct !== b.overdue_threshold_pct) return false;

            const configA = a.work_schedule_config;
            const configB = b.work_schedule_config;
            if (!configA && !configB) return true;
            if (!configA || !configB) return false;
            return JSON.stringify(configA) === JSON.stringify(configB);
          };

          const versionNames = [];
          let nextMajor = 1;

          for (let i = 0; i < chronoList.length; i++) {
            const current = chronoList[i];
            let matchIndex = -1;

            for (let j = 0; j < i; j++) {
              if (configsEqual(current, chronoList[j])) {
                matchIndex = j;
                break;
              }
            }

            if (matchIndex === -1) {
              const name = `${nextMajor}`;
              versionNames.push(name);
              nextMajor++;
            } else {
              const rootName = versionNames[matchIndex];
              let subVersionCount = 0;
              for (let k = 0; k < i; k++) {
                if (versionNames[k] === rootName || versionNames[k].startsWith(`${rootName}.`)) {
                  subVersionCount++;
                }
              }
              const name = `${rootName}.${subVersionCount}`;
              versionNames.push(name);
            }
          }

          for (let i = 0; i < chronoList.length; i++) {
            chronoList[i].version_name = versionNames[i];
            chronoList[i].restored_dates = [];
          }

          const seenConfigIndices = {};
          const hiddenIndices = new Set();

          for (let i = 0; i < chronoList.length; i++) {
            const sig = configSignature(chronoList[i]);
            if (seenConfigIndices[sig] !== undefined) {
              const origIdx = seenConfigIndices[sig];
              if (chronoList[i].timestamp !== chronoList[origIdx].timestamp) {
                if (!chronoList[origIdx].restored_dates.includes(chronoList[i].timestamp)) {
                  chronoList[origIdx].restored_dates.push(chronoList[i].timestamp);
                }
              }

              if (chronoList[i].is_active_rule) {
                chronoList[origIdx].is_active_rule = true;
                chronoList[origIdx].end_date = chronoList[i].end_date;
                chronoList[origIdx].actor = chronoList[i].actor;
              }
              hiddenIndices.add(i);
            } else {
              seenConfigIndices[sig] = i;
            }
          }

          const dedupedList = chronoList.filter((_, i) => !hiddenIndices.has(i));
          const reversedList = dedupedList.reverse();
          const sortedHistory = [...reversedList].sort((a, b) => {
            if (a.is_active_rule) return -1;
            if (b.is_active_rule) return 1;
            const dateA = getVersionDate(a);
            const dateB = getVersionDate(b);
            return dateB - dateA;
          });
          setHistory(sortedHistory);
        }
      }
    } catch (err) {
      console.error("Failed to load SLA configuration details:", err);
      setResultModal({
        show: true,
        type: "error",
        title: "Connection Error",
        message: "Unable to establish a connection to the backend database service. Please ensure that the services are online and try again."
      });
    }
  };

  useEffect(() => {
    setWorkingDays([]);
    loadData();
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    if (workingDays.length === 0) {
      setResultModal({
        show: true,
        type: "error",
        title: "No Working Days Selected",
        message: "Please select at least one working day (Calendar Schedule) before publishing these SLA configuration rules. You must configure at least one working day for the active period."
      });
      return;
    }

    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (endMinutes <= startMinutes) {
      setResultModal({
        show: true,
        type: "error",
        title: "Invalid Daily Shift Hours",
        message: "The Daily Shift Time End must be strictly after the Daily Shift Time Start. Please adjust your hours so that the end time occurs after the start time before publishing these SLA rules."
      });
      return;
    }

    // Build the config signature for the current form values to check against history
    const isWeekdaysCheck = workingDays.length === 5 &&
      ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].every(d => workingDays.includes(d));
    const isMonToSatCheck = workingDays.length === 6 &&
      ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].every(d => workingDays.includes(d));

    let formScheduleType = "CUSTOM";
    let formScheduleConfig = null;
    if (isWeekdaysCheck) {
      formScheduleType = "WEEKDAYS";
    } else if (isMonToSatCheck) {
      formScheduleType = "MONDAY_TO_SATURDAY";
    } else {
      formScheduleType = "CUSTOM";
      formScheduleConfig = DAYS_OF_WEEK.map(day => ({
        day,
        is_working: workingDays.includes(day),
        start: startTime.slice(0, 5),
        end: endTime.slice(0, 5)
      }));
    }

    const formEntry = {
      work_schedule_type: formScheduleType,
      work_start_time: startTime.slice(0, 5),
      work_end_time: endTime.slice(0, 5),
      overdue_threshold_pct: 100,
      work_schedule_config: formScheduleConfig
    };
    const formSig = configSignature(formEntry);

    // Check if the current form config already exists in history (excluding the active rule)
    const existingMatch = history.find(
      item => !item.is_active_rule && configSignature(item) === formSig
    );

    if (existingMatch) {
      setMatchingExistingVersion(existingMatch);
      setShowRestoreExistingConfirm(true);
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirm(false);

    const isWeekdays = workingDays.length === 5 &&
      workingDays.includes("Monday") &&
      workingDays.includes("Tuesday") &&
      workingDays.includes("Wednesday") &&
      workingDays.includes("Thursday") &&
      workingDays.includes("Friday");

    const isMonToSat = workingDays.length === 6 &&
      workingDays.includes("Monday") &&
      workingDays.includes("Tuesday") &&
      workingDays.includes("Wednesday") &&
      workingDays.includes("Thursday") &&
      workingDays.includes("Friday") &&
      workingDays.includes("Saturday");

    let scheduleType = "CUSTOM";
    let scheduleConfig = null;
    if (isWeekdays) {
      scheduleType = "WEEKDAYS";
    } else if (isMonToSat) {
      scheduleType = "MONDAY_TO_SATURDAY";
    } else {
      scheduleType = "CUSTOM";
      scheduleConfig = DAYS_OF_WEEK.map(day => ({
        day,
        is_working: workingDays.includes(day),
        start: startTime.slice(0, 5),
        end: endTime.slice(0, 5)
      }));
    }

    const payload = {
      work_schedule_type: scheduleType,
      work_schedule_config: scheduleConfig,
      work_start_time: startTime.slice(0, 5),
      work_end_time: endTime.slice(0, 5),
      overdue_threshold_pct: 100,
      warn_threshold_pct: warnThreshold
    };

    try {
      if (activeRuleId) {
        await updateSlaRule(activeRuleId, payload);
      } else {
        await createSlaRule(payload);
      }
      setShowConfirm(false);
      setResultModal({
        show: true,
        type: "success",
        title: "Success",
        message: "SLA Compliance Rules updated and new version saved successfully!"
      });
      await loadData();
    } catch (err) {
      console.error("Failed to save SLA configuration:", err);
      setShowConfirm(false);
      setResultModal({
        show: true,
        type: "error",
        title: "SLA Save Failure",
        message: err.message || "Failed to save the SLA configuration rules. Please verify your backend server state and database parameters."
      });
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoringVersion || !activeRuleId) return;
    try {
      await restoreSlaVersion(activeRuleId, restoringVersion.id);
      setRestoringVersion(null);
      setResultModal({
        show: true,
        type: "success",
        title: "Success",
        message: "SLA compliance rules version restored successfully!"
      });
      await loadData();
    } catch (err) {
      console.error("Failed to restore SLA version:", err);
      setRestoringVersion(null);
      setResultModal({
        show: true,
        type: "error",
        title: "Error",
        message: err.message || "Failed to restore SLA compliance rules version"
      });
    }
  };

  const toggleDay = (day) => {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, bgcolor: '#F8FAFC', minHeight: '100vh' }}>
      {/* Top Header */}
      <PageHeader breadcrumb="SLA Rules" title="Service Level Agreement" subtitle="Configure SLA computation rules and manage version history." />

      {/* Read-Only Notice for non-write roles */}
      {!canSeeSlaForm && (
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
          SLA rules are managed by the Planning Officer. You have <strong>read-only</strong> access to the version history.
        </Alert>
      )}

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: canSeeSlaForm ? { xs: '1fr', md: '7fr 5fr' } : '1fr',
        gap: 4,
        mt: 2,
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Left Form Panel — only shown for roles with SLA write permission */}
        {canSeeSlaForm && (
          <Card sx={{ alignSelf: 'start', borderRadius: '8px', p: { xs: 2, sm: 3 }, border: '1px solid #E2E8F0', bgcolor: 'background.paper', width: '100%', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column' }}>
              <Box>
                {/* Working Days */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Working Days (Calendar Schedule) *
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                    {DAYS_OF_WEEK.map(day => {
                      const isSelected = workingDays.includes(day);
                      return (
                        <Chip
                          key={day}
                          label={day.slice(0, 3)}
                          onClick={() => toggleDay(day)}
                          color={isSelected ? "primary" : "default"}
                          variant={isSelected ? "filled" : "outlined"}
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            height: '38px',
                            width: '100%',
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: isSelected ? 'primary.dark' : '#F1F5F9',
                            }
                          }}
                        />
                      );
                    })}
                  </Box>
                </Box>

                {/* Time Pickers */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 4 }}>
                  <div className="field">
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                      Daily Shift Time Start <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="field-input"
                      style={{
                        padding: '10px 14px',
                        border: '1.5px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '13px',
                        outline: 'none',
                        color: '#1E293B',
                        boxSizing: 'border-box',
                        width: '100%',
                        backgroundColor: '#ffffff',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                  <div className="field">
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                      Daily Shift Time End <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="field-input"
                      style={{
                        padding: '10px 14px',
                        border: '1.5px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '13px',
                        outline: 'none',
                        color: '#1E293B',
                        boxSizing: 'border-box',
                        width: '100%',
                        backgroundColor: '#ffffff',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                </Box>



                {/* Disclaimer Alert */}
                <Alert severity="warning" variant="outlined" sx={{ bgcolor: '#FFFBEB', color: '#B45309', borderColor: '#FDE68A', mb: 3 }}>
                  Saving creates a new version of the SLA rules. This will not affect existing transactions — only future SLA processing will follow the updated configuration.
                </Alert>
              </Box>

              {/* Submit Action */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  type="submit"
                  size="large"
                  sx={{
                    bgcolor: '#15803D',
                    '&:hover': { bgcolor: '#166534' },
                    px: 4,
                    py: 1.2,
                    fontWeight: 700
                  }}
                >
                  Save &amp; publish SLA rules version
                </Button>
              </Box>
            </form>
          </Card>
        )}

        {/* Right Audit Log / Version History */}
        <Box sx={{ width: '100%', maxWidth: canSeeSlaForm ? '100%' : '800px', mx: 'auto' }}>
          <Card sx={{ borderRadius: '8px', p: { xs: 2, sm: 3 }, border: '1px solid #E2E8F0', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', width: '100%', height: '100%', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 1.5, borderBottom: '1px solid #F1F5F9' }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 1 }}>
                <HistoryIcon fontSize="small" />
                Version History Registry
              </Typography>
              <Chip label={`${history.length} records`} size="small" sx={{ fontWeight: 700, bgcolor: '#F1F5F9', color: 'text.secondary' }} />
            </Box>

            {history.length > 0 ? (
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                maxHeight: '520px',
                overflowY: 'auto',
                pr: 1.5,
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#F1F5F9',
                  borderRadius: '10px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#CBD5E1',
                  borderRadius: '10px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: '#94A3B8',
                }
              }}>
                {(() => {
                  let currentMonthYear = "";
                  return history.map((item, index) => {
                    const monthYear = getMonthYear(getVersionDate(item));
                    const showHeader = monthYear && monthYear !== currentMonthYear;
                    if (showHeader) {
                      currentMonthYear = monthYear;
                    }

                    const isExpanded = expandedVersions[item.id] !== undefined
                      ? expandedVersions[item.id]
                      : item.is_active_rule;

                    return (
                      <Box key={item.id}>
                        {showHeader && (
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 700,
                              color: 'text.secondary',
                              mt: index === 0 ? 0 : 2.5,
                              mb: 1.5,
                              fontSize: '0.8125rem'
                            }}
                          >
                            {monthYear}
                          </Typography>
                        )}

                        <Box
                          sx={{
                            borderRadius: '8px',
                            p: isExpanded ? '16px' : '12px 16px',
                            mb: 1.5,
                            border: '1px solid #E2E8F0',
                            borderLeft: item.is_active_rule ? '4px solid #800000' : '1px solid #E2E8F0',
                            bgcolor: '#ffffff',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: '#F8FAFC',
                              cursor: 'pointer'
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                            <Box
                              onClick={() => toggleVersionExpand(item.id)}
                              sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 1.5,
                                flexGrow: 1,
                                userSelect: 'none'
                              }}
                            >
                              <Box sx={{ mt: 0.25, display: 'flex', alignItems: 'center' }}>
                                {isExpanded ? (
                                  <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                ) : (
                                  <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                )}
                              </Box>

                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                  {customNames[configSignature(item)] ? (
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                      {customNames[configSignature(item)]}
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                      {item.timestamp}
                                    </Typography>
                                  )}
                                  {item.is_active_rule && (
                                    <Chip
                                      label="Active"
                                      size="small"
                                      color="success"
                                      sx={{
                                        height: 18,
                                        fontSize: '0.625rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        px: 0.5
                                      }}
                                    />
                                  )}
                                </Box>

                                {customNames[configSignature(item)] && (
                                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                                    {item.timestamp}
                                  </Typography>
                                )}

                                {item.is_active_rule && (
                                  <Typography variant="caption" sx={{ color: '#800000', fontWeight: 700, display: 'block', mt: 0.25 }}>
                                    Current version
                                  </Typography>
                                )}
                                {item.restored_dates && item.restored_dates.length > 0 && (
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.25 }}>
                                    {item.restored_dates.map((rd, rIdx) => (
                                      <Typography
                                        key={rIdx}
                                        variant="caption"
                                        sx={{
                                          color: '#800000',
                                          fontWeight: 700,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 0.5
                                        }}
                                      >
                                        <HistoryIcon sx={{ fontSize: 12 }} />
                                        Date Restored: {rd}
                                      </Typography>
                                    ))}
                                  </Box>
                                )}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75 }}>
                                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#0D9488' }} />
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    {getActorDisplayName(item.actor)}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, alignSelf: 'center' }}>
                              {!item.is_active_rule && canWriteSla && (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRestoringVersion(item);
                                  }}
                                  sx={{
                                    color: '#800000',
                                    borderColor: '#800000',
                                    '&:hover': {
                                      bgcolor: 'rgba(128, 0, 0, 0.04)',
                                      borderColor: '#800000'
                                    },
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    borderRadius: 2,
                                    py: 0.25,
                                    px: 1.5,
                                    height: 26,
                                  }}
                                >
                                  Restore
                                </Button>
                              )}

                              {canWriteSla && (
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleOpenMenu(e, item)}
                                  sx={{
                                    color: 'text.secondary',
                                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                                  }}
                                >
                                  <MoreVertIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              )}
                            </Box>
                          </Box>

                          {isExpanded && (
                            <Box sx={{
                              mt: 2,
                              pl: { xs: 2, sm: 4 },
                              pr: { xs: 2, sm: 4 },
                              display: 'grid',
                              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                              gap: { xs: 2, sm: 4 },
                              borderTop: '1px dashed #E2E8F0',
                              pt: 2
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <CalendarMonthIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Box>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 500 }}>
                                    Working Days
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                    {item.working_days}
                                  </Typography>
                                </Box>
                              </Box>

                              <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                borderLeft: { xs: 'none', sm: '1px dashed #E2E8F0' },
                                pl: { xs: 0, sm: 4 }
                              }}>
                                <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Box>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontWeight: 500 }}>
                                    Daily Shift
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                    {item.working_hours}
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    );
                  });
                })()}
              </Box>
            ) : (
              <Box sx={{ textAlign: "center", py: 5, color: "text.disabled", fontStyle: "italic", fontSize: "0.8125rem" }}>
                No audit logs captured for the active evaluation period.
              </Box>
            )}
          </Card>
        </Box>
      </Box>


      {/* ── Save Confirmation Modal ── */}
      <ConfirmModal
        open={showConfirm}
        title="Confirm SLA Rule Update"
        subtitle="This action will publish a new configuration version"
        body={
          <>
            You are about to{' '}
            <span style={{ color: '#0F172A', fontWeight: '700' }}>save and publish a new version</span>{' '}
            of the SLA compliance rules. The updated settings will apply to{' '}
            <span style={{ color: '#0F172A', fontWeight: '700' }}>all future SLA computations</span> only.
          </>
        }
        alertText={
          <>
            Existing transactions and previously computed SLA records{' '}
            <span style={{ color: '#14532D', fontWeight: '700' }}>will not be affected</span>. This is a non-destructive versioned update.
          </>
        }
        confirmLabel="Yes, Publish New Version"
        onConfirm={handleConfirmSave}
        onCancel={() => setShowConfirm(false)}
      />

      {/* ── Restore Confirmation Modal (from Version History) ── */}
      <ConfirmModal
        open={Boolean(restoringVersion)}
        title={`Restore Version ${restoringVersion ? restoringVersion.version_name : ""}?`}
        subtitle="This action will restore a previous configuration version"
        body={
          <>
            Are you sure you want to restore{" "}
            <span style={{ color: '#0F172A', fontWeight: '700' }}>Version {restoringVersion ? restoringVersion.version_name : ""}</span>{" "}
            of the SLA compliance rules?
          </>
        }
        alertText={
          <>
            This will apply the selected version's work schedule, shift, and thresholds to all future computations. The current active settings will be saved as a new version.
          </>
        }
        confirmLabel="Yes, Restore Version"
        onConfirm={handleConfirmRestore}
        onCancel={() => setRestoringVersion(null)}
      />

      {/* ── Restore Existing Version Confirmation (triggered from Save form) ── */}
      <ConfirmModal
        open={showRestoreExistingConfirm}
        title="Existing Version Detected"
        subtitle="A matching configuration already exists in version history"
        body={
          <>
            The settings you entered match an{' '}
            <span style={{ color: '#0F172A', fontWeight: '700' }}>
              existing version ({matchingExistingVersion?.timestamp})
            </span>{' '}
            in the version history. Would you like to{' '}
            <span style={{ color: '#0F172A', fontWeight: '700' }}>restore that version</span>{' '}
            instead of publishing a duplicate?
          </>
        }
        alertText={
          <>
            Restoring will re-activate the matched version's settings for all future SLA computations. No duplicate version will be created.
          </>
        }
        confirmLabel="Yes, Restore Existing Version"
        cancelLabel="Cancel"
        onConfirm={async () => {
          setShowRestoreExistingConfirm(false);
          if (!matchingExistingVersion || !activeRuleId) return;
          try {
            await restoreSlaVersion(activeRuleId, matchingExistingVersion.id);
            setMatchingExistingVersion(null);
            setResultModal({
              show: true,
              type: "success",
              title: "Version Restored",
              message: "The existing SLA configuration version has been successfully restored!"
            });
            await loadData();
          } catch (err) {
            console.error("Failed to restore existing SLA version:", err);
            setMatchingExistingVersion(null);
            setResultModal({
              show: true,
              type: "error",
              title: "Restore Failed",
              message: err.message || "Failed to restore the existing SLA configuration version."
            });
          }
        }}
        onCancel={() => {
          setShowRestoreExistingConfirm(false);
          setMatchingExistingVersion(null);
        }}
      />

      {/* Result Modal */}
      {resultModal.show && (
        <ResultModal
          type={resultModal.type}
          title={resultModal.title}
          message={resultModal.message}
          onClose={() => setResultModal(prev => ({ ...prev, show: false }))}
        />
      )}

      {/* Snackbar Toast */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ── Google Docs Style 3-Dot Dropdown Menu ── */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 3,
          sx: {
            borderRadius: '8px',
            minWidth: 160,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
          }
        }}
      >
        <MenuItem
          onClick={handleMenuRename}
          sx={{ fontSize: '0.8125rem', fontWeight: 500, py: 1 }}
        >
          Name this version
        </MenuItem>
        <MenuItem
          onClick={handleCloseMenu}
          sx={{ fontSize: '0.8125rem', fontWeight: 500, py: 1 }}
        >
          Make a copy
        </MenuItem>
      </Menu>

      {/* ── Rename Version Modal ── */}
      <Dialog
        open={Boolean(renamingItem)}
        onClose={() => setRenamingItem(null)}
        PaperProps={{
          sx: {
            borderRadius: '8px',
            width: '100%',
            maxWidth: 400
          }
        }}
      >
        <DialogTitle sx={{ fontSize: '1.1rem', fontWeight: 700, pb: 1 }}>
          Name this version
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Version name"
            type="text"
            fullWidth
            variant="outlined"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px'
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: '12px 24px' }}>
          <Button
            onClick={() => setRenamingItem(null)}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              color: 'text.secondary'
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveName}
            variant="contained"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: '#15803D',
              '&:hover': { bgcolor: '#166534' }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
