import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
  Paper,
  Tooltip,
  Divider,
  Chip,
  InputAdornment
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarMonth as CalendarMonthIcon,
  Sync as SyncIcon
} from '@mui/icons-material';

import { useAppStore } from "../store/useAppStore";
import PageHeader from "../components/PageHeader";
import HolidayModal from "../modals/HolidayModal";
import DeleteConfirmModal from "../modals/DeleteConfirmModal";
import HolidayRegistryModal from "../modals/HolidayRegistryModal";
import ResultModal from "../modals/ResultModal";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TYPE_CONFIG = {
  National: { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", label: "National" },
  Local: { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", label: "Local" },
  Campus: { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", label: "Campus" },
};

const mapTypeToBackend = (t) => {
  switch (t) {
    case "National": return "REGULAR";
    case "Local": return "SPECIAL_NON_WORKING";
    case "Campus": return "COMPANY";
    default: return "REGULAR";
  }
};

export default function HolidayCalendar() {
  const {
    holidays,
    fetchHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    permissions,
  } = useAppStore();

  const canWriteHolidays = permissions?.canWriteHolidays || false;

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("National");
  const [isRecurring, setIsRecurring] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [deletingHoliday, setDeletingHoliday] = useState(null);
  const [showRegistryModal, setShowRegistryModal] = useState(false);
  const [resultModal, setResultModal] = useState({ open: false, type: "success", title: "", message: "" });
  const [holidayWarning, setHolidayWarning] = useState("");
  const [holidayErrors, setHolidayErrors] = useState({});

  const triggerSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  useEffect(() => {
    fetchHolidays({ year: currentYear });
  }, [currentYear]);

  /* ── navigation ── */
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  /* ── calendar math ── */
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstWeekday = new Date(currentYear, currentMonth, 1).getDay();
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  const pad = n => String(n).padStart(2, "0");
  const toKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

  const filteredHolidays = (Array.isArray(holidays) ? holidays : []).filter(h => {
    if (!h) return false;
    const q = (searchQuery || "").toLowerCase();
    const name = (h.name || "").toLowerCase();
    const matchesSearch = name.includes(q);
    const matchesType = !typeFilter || h.type === typeFilter;
    const matchesMonth = monthFilter === "" || (h.date ? new Date(h.date).getMonth() === parseInt(monthFilter) : false);
    return matchesSearch && matchesType && matchesMonth;
  });

  const holidayMap = {};
  filteredHolidays.forEach(h => {
    if (!holidayMap[h.date]) holidayMap[h.date] = [];
    holidayMap[h.date].push(h);
  });

  /* ── modal helpers ── */
  const openAdd = (preDate = "") => {
    setName("");
    setDate(preDate || toKey(currentYear, currentMonth, today.getDate()));
    setType("National");
    setIsRecurring(false);
    setEditingHoliday(null);
    setHolidayWarning("");
    setHolidayErrors({});
    setShowModal(true);
  };

  const openEdit = h => {
    setName(h.name);
    setDate(h.date);
    setType(h.type);
    setIsRecurring(h.is_recurring || false);
    setEditingHoliday(h);
    setHolidayWarning("");
    setHolidayErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingHoliday(null);
    setHolidayWarning("");
    setHolidayErrors({});
    // NOTE: do NOT clear deletingHoliday here — that's managed separately
  };

  const handleSave = async e => {
    e.preventDefault();
    const errs = {};
    if (!name.trim()) errs.name = "Holiday name is required.";
    if (!date) errs.date = "Date is required.";
    if (!type) errs.type = "Holiday type is required.";
    if (Object.keys(errs).length > 0) {
      setHolidayErrors(errs);
      return;
    }
    setHolidayErrors({});
    const dup = holidays.some(h => h.date === date && h.id !== editingHoliday?.id);
    if (dup) {
      setResultModal({
        open: true,
        type: "error",
        title: "Duplicate Holiday",
        message: `A holiday already exists on ${date}.`
      });
      return;
    }

    const [yearPart, monthPart, dayPart] = date.split('-').map(Number);
    const payload = {
      name,
      month: monthPart,
      day: dayPart,
      year: yearPart,
      type: mapTypeToBackend(type),
      is_recurring: isRecurring
    };

    try {
      if (editingHoliday) {
        const res = await updateHoliday(editingHoliday.id, payload);
        if (res && res.warning) {
          setHolidayWarning(res.warning);
          return;
        }
        setResultModal({
          open: true,
          type: "success",
          title: "Success!",
          message: `Holiday '${name}' updated successfully.`
        });
      } else {
        const res = await createHoliday(payload);
        if (res && res.warning) {
          setHolidayWarning(res.warning);
          return;
        }
        setResultModal({
          open: true,
          type: "success",
          title: "Success!",
          message: isRecurring ? `Recurring holiday '${name}' encoded for 5 years.` : `Holiday '${name}' encoded successfully.`
        });
      }
      closeModal();
    } catch (err) {
      console.error(err);
      setResultModal({
        open: true,
        type: "error",
        title: "Holiday Save Failed",
        message: err.message || "Failed to save holiday."
      });
    }
  };

  const handleDelete = async (id, hName) => {
    try {
      await deleteHoliday(id);
      setResultModal({
        open: true,
        type: "success",
        title: "Success",
        message: `"${hName}" deleted successfully.`
      });
      setDeletingHoliday(null);
      setShowModal(false);
      setEditingHoliday(null);
    } catch (err) {
      console.error(err);
      setResultModal({
        open: true,
        type: "error",
        title: "Failed to Delete Holiday",
        message: err.message || "Failed to delete holiday."
      });
    }
  };

  /* ── sidebar holidays for selected date ── */
  const selectedKey = selectedDate ? toKey(currentYear, currentMonth, selectedDate) : null;
  const selectedHolidays = selectedKey ? (holidayMap[selectedKey] || []) : [];

  const allHolidaysSorted = [...filteredHolidays]
    .filter(h => h.date && !isNaN(new Date(h.date).getTime()))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Group holidays by name for a clean, non-repetitive Holiday Registry view
  const registryGroups = [];
  allHolidaysSorted.forEach(h => {
    const existing = registryGroups.find(g => g.name.toLowerCase() === h.name.toLowerCase() && g.type === h.type);
    const d = new Date(h.date);
    const y = d.getFullYear();

    if (existing) {
      existing.years.push(y);
      existing.records.push(h);
    } else {
      registryGroups.push({
        id: h.id,
        name: h.name,
        type: h.type,
        is_recurring: h.is_recurring,
        years: [y],
        records: [h],
        dateObject: d
      });
    }
  });

  // Compute year ranges for grouped registry items
  registryGroups.forEach(g => {
    g.years.sort((a, b) => a - b);
    const min = g.years[0];
    const max = g.years[g.years.length - 1];
    g.yearLabel = min === max ? `${min}` : `${min} - ${max}`;
  });

  /* ── build calendar cells ── */
  const cells = [];
  for (let i = firstWeekday - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, type: "prev" });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, type: "cur" });
  while (cells.length < 42) cells.push({ day: cells.length - daysInMonth - firstWeekday + 1, type: "next" });

  const isToday = d => d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, display: "flex", flexDirection: "column", bgcolor: "#F8FAFC", minHeight: "100vh" }}>
      {/* ── Page Header ── */}
      <PageHeader
        breadcrumb="Holiday Calendar"
        title="Holiday Calendar"
      />

      {/* ── Filter Controls ── */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end', mb: 3 }}>
          
          {/* Search Field */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Search Holiday
            </Typography>
            <TextField
              placeholder="Search..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                width: 260,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  height: '38px',
                  fontSize: '0.875rem',
                  color: '#1E293B',
                  '& fieldset': { borderColor: '#CBD5E1' },
                  '&:hover fieldset': { borderColor: '#94A3B8' },
                  '&.Mui-focused fieldset': { borderColor: '#64748B', borderWidth: '1px' },
                }
              }}
            />
          </Box>

          {/* Holiday Type Field */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: { xs: 'calc(50% - 6px)', sm: 180 } }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Holiday Type
            </Typography>
            <TextField
              select
              size="small"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
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
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="National">National</MenuItem>
              <MenuItem value="Local">Local</MenuItem>
              <MenuItem value="Campus">Campus</MenuItem>
            </TextField>
          </Box>

          {/* Month Field */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: { xs: 'calc(50% - 6px)', sm: 150 } }}>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Month
            </Typography>
            <TextField
              select
              size="small"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
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
              <MenuItem value="">All Months</MenuItem>
              {MONTHS.map((m, idx) => (
                <MenuItem key={m} value={idx}>{m}</MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Reset Filters */}
          {(searchQuery || typeFilter || monthFilter !== "") && (
            <Button
              variant="outlined"
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("");
                setMonthFilter("");
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

          {/* Add Holiday Button */}
          {canWriteHolidays && (
            <Button
              variant="contained"
              startIcon={<AddIcon sx={{ fontSize: 20 }} />}
              onClick={() => openAdd()}
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
              Add Holiday
            </Button>
          )}
      </Box>

      {/* ── Main Layout ── */}
      <Box sx={{ display: "flex", gap: 3, flexWrap: { xs: "wrap", md: "nowrap" }, width: "100%", mt: 1 }}>
        {/* ══ Sidebar Panel ══ */}
        <Box sx={{
          flex: { xs: "1 1 100%", md: "0 0 calc(33.333333% - 12px)" },
          minWidth: 0,
          width: "100%",
          order: { xs: 2, md: 1 }
        }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Selected Date Detail Card */}
            <Card sx={{ p: 3, borderRadius: "8px", border: "1px solid #E2E8F0", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
              {selectedDate ? (
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Selected Date
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary" }}>
                        {MONTHS[currentMonth]} {selectedDate}, {currentYear}
                      </Typography>
                    </Box>
                    {canWriteHolidays && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      onClick={() => openAdd(toKey(currentYear, currentMonth, selectedDate))}
                      sx={{ borderRadius: 2, fontWeight: 700 }}
                    >
                      + Add
                    </Button>
                    )}
                  </Box>

                  {selectedHolidays.length > 0 ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      {selectedHolidays.map(h => {
                        const config = TYPE_CONFIG[h.type];
                        return (
                          <Paper
                            key={h.id}
                            variant="outlined"
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              border: "1px solid #E2E8F0",
                              bgcolor: "#ffffff"
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                              <Chip
                                label={h.type}
                                size="small"
                                sx={{
                                  bgcolor: config?.bg,
                                  color: config?.color,
                                  border: `1px solid ${config?.border}`,
                                  fontWeight: 700,
                                  fontSize: "10px",
                                }}
                              />
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
                                  {h.name}
                                </Typography>
                                {h.is_recurring && (
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                                    <SyncIcon sx={{ fontSize: 11, color: "text.secondary" }} />
                                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
                                      Recurring Annual
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            </Box>
                            {canWriteHolidays && (
                            <IconButton
                              size="small"
                              onClick={() => openEdit(h)}
                              sx={{
                                border: "1px solid #E2E8F0",
                                borderRadius: 1.5,
                                '&:hover': { bgcolor: '#F1F5F9' }
                              }}
                            >
                              <EditIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                            </IconButton>
                            )}
                          </Paper>
                        );
                      })}
                    </Box>
                  ) : (
                    <Box sx={{ py: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                      <CalendarMonthIcon sx={{ fontSize: 36, color: "#CBD5E1", mb: 1 }} />
                      <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500, mb: 1.5 }}>
                        No holidays on this date
                      </Typography>
                   {canWriteHolidays && (
                      <Button
                        size="small"
                        color="primary"
                        onClick={() => openAdd(toKey(currentYear, currentMonth, selectedDate))}
                        sx={{ fontWeight: 700 }}
                      >
                        Encode one
                      </Button>
                    )}
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={{ py: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                  <CalendarMonthIcon sx={{ fontSize: 42, color: "#CBD5E1", mb: 1.5 }} />
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    Click a date to see its holidays
                  </Typography>
                </Box>
              )}
            </Card>

            {/* Holiday Registry Card */}
            <Card sx={{ p: 3, borderRadius: "8px", border: "1px solid #E2E8F0", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary" }}>
                Holiday Registry
              </Typography>
              <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 700, display: "block", mb: 2, textTransform: "uppercase" }}>
                {registryGroups.length} holiday{registryGroups.length !== 1 ? "s" : ""} defined
              </Typography>

              {registryGroups.length > 0 ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pr: 0.5 }}>
                  {registryGroups.slice(0, 3).map(g => {
                    const d = g.dateObject;
                    return (
                      <Paper
                        key={g.id}
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          border: "1px solid #E2E8F0"
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              bgcolor: TYPE_CONFIG[g.type]?.color || "#888",
                              color: "#ffffff",
                              borderRadius: 2,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0
                            }}
                          >
                            <Typography sx={{ fontSize: "14px", fontWeight: 800, lineHeight: 1.1 }}>
                              {d.getDate()}
                            </Typography>
                            <Typography sx={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 1 }}>
                              {MONTHS[d.getMonth()].slice(0, 3)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
                              {g.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}>
                              {g.type}{g.is_recurring ? " · Recurring" : ""} · {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][d.getMonth()]} {d.getDate()}, {g.yearLabel}
                            </Typography>
                          </Box>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => openEdit(g.records[0])}
                          sx={{
                            border: "1px solid #E2E8F0",
                            borderRadius: 1.5,
                            '&:hover': { bgcolor: '#F1F5F9' },
                            flexShrink: 0
                          }}
                        >
                          <EditIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                        </IconButton>
                      </Paper>
                    );
                  })}

                  {/* View All button – always shown when holidays exist */}
                  {registryGroups.length > 0 && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setShowRegistryModal(true)}
                      sx={{
                        mt: 0.5, fontWeight: 700, fontSize: 12,
                        color: "#800000", borderColor: "#800000",
                        alignSelf: "stretch",
                        '&:hover': { bgcolor: '#FFF5F5', borderColor: '#800000' }
                      }}
                    >
                      View All {registryGroups.length} Holiday{registryGroups.length !== 1 ? "s" : ""}
                    </Button>
                  )}
                </Box>
              ) : (
                <Box sx={{ py: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                  <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                    No holidays in registry
                  </Typography>
                </Box>
              )}
            </Card>
          </Box>
        </Box>

        {/* ══ Calendar Panel ══ */}
        <Box sx={{
          flex: { xs: "1 1 100%", md: "0 0 calc(66.666667% - 12px)" },
          minWidth: 0,
          width: "100%",
          order: { xs: 1, md: 2 }
        }}>
          <Card sx={{ p: 2, borderRadius: "8px", border: "1px solid #E2E8F0", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", bgcolor: "#ffffff", height: "100%" }}>
            {/* Calendar Control Header */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary" }}>
                  {MONTHS[currentMonth]}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 500, color: "text.secondary" }}>
                  {currentYear}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <IconButton
                  onClick={prevMonth}
                  sx={{
                    border: "1px solid #E2E8F0",
                    borderRadius: 2,
                    p: 1,
                    '&:hover': { bgcolor: '#F1F5F9' }
                  }}
                  aria-label="Previous month"
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <IconButton
                  onClick={nextMonth}
                  sx={{
                    border: "1px solid #E2E8F0",
                    borderRadius: 2,
                    p: 1,
                    '&:hover': { bgcolor: '#F1F5F9' }
                  }}
                  aria-label="Next month"
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Type Legend */}
            <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
              {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: config.color }} />
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                    {config.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Weekday Grid Headers */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                mb: 1.5,
                borderBottom: "1px solid #F1F5F9",
                pb: 1,
                textAlign: "center"
              }}
            >
              {DAY_LABELS.map((d, idx) => {
                const isSunday = idx === 0;
                return (
                  <Typography
                    key={d}
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: isSunday ? "#DC2626" : "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontSize: "11px"
                    }}
                  >
                    {d}
                  </Typography>
                );
              })}
            </Box>

            {/* Calendar Cells Grid */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "1px",
                bgcolor: "#F1F5F9",
                border: "1px solid #F1F5F9",
                borderRadius: 2,
                overflow: "hidden"
              }}
            >
              {cells.map((cell, idx) => {
                const isCur = cell.type === "cur";
                const key = isCur ? toKey(currentYear, currentMonth, cell.day) : null;
                const hols = key ? (holidayMap[key] || []) : [];
                const isSel = isCur && selectedDate === cell.day;
                const isTod = isCur && isToday(cell.day);
                const isSun = idx % 7 === 0;

                return (
                  <Box
                    key={`${cell.type}-${idx}`}
                    onClick={() => isCur && setSelectedDate(cell.day)}
                    sx={{
                      minHeight: 72,
                      p: 1,
                      bgcolor: !isCur ? "#F8FAFC" : isSel ? "#FFF5F5" : "#ffffff",
                      border: isSel ? "1.5px solid #800000" : isTod ? "1.5px solid rgba(128, 0, 0, 0.3)" : "none",
                      boxShadow: isSel ? "inset 0 0 0 1px #800000" : "none",
                      cursor: isCur ? "pointer" : "not-allowed",
                      transition: "all 0.15s ease-in-out",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      '&:hover': {
                        bgcolor: isCur ? (isSel ? "#FFF5F5" : "#FFF8F8") : "#F8FAFC",
                      }
                    }}
                  >
                    {/* Top Row: Date marker */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isTod ? 800 : 600,
                          color: !isCur ? "text.disabled" : isSun ? "#DC2626" : "text.primary",
                          fontSize: "0.875rem"
                        }}
                      >
                        {cell.day}
                      </Typography>

                      {/* Holiday indicator dots (mobile/small view) */}
                      {hols.length > 0 && (
                        <Box sx={{ display: { xs: "flex", sm: "none" }, gap: 0.5 }}>
                          {hols.slice(0, 3).map((h, i) => (
                            <Box
                              key={i}
                              sx={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                bgcolor: TYPE_CONFIG[h.type]?.color || "#888"
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>

                    {/* Bottom Row: Holiday chips stack */}
                    {hols.length > 0 && isCur && (
                      <Box sx={{ display: { xs: "none", sm: "flex" }, flexDirection: "column", gap: 0.5, mt: 1, width: "100%" }}>
                        {hols.slice(0, 1).map((h, i) => {
                          const config = TYPE_CONFIG[h.type];
                          return (
                            <Box
                              key={i}
                              sx={{
                                fontSize: "10px",
                                fontWeight: 700,
                                px: 1,
                                py: 0.25,
                                borderRadius: "4px",
                                bgcolor: config?.bg || "#F1F5F9",
                                color: config?.color || "#555",
                                border: `1px solid ${config?.border || "#E2E8F0"}`,
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                                width: "100%",
                                boxSizing: "border-box"
                              }}
                            >
                              {h.name}
                            </Box>
                          );
                        })}
                        {hols.length > 1 && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: "9px",
                              fontWeight: 700,
                              color: "text.disabled",
                              pl: 0.5
                            }}
                          >
                            +{hols.length - 2} more
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Card>
        </Box>
      </Box>

      {/* ── Add / Edit Holiday Modal ── */}
      <HolidayModal
        open={showModal}
        editingHoliday={editingHoliday}
        name={name} setName={setName}
        date={date} setDate={(newDate) => { setDate(newDate); setHolidayWarning(""); }}
        type={type} setType={setType}
        isRecurring={isRecurring} setIsRecurring={setIsRecurring}
        warning={holidayWarning}
        errors={holidayErrors}
        setErrors={setHolidayErrors}
        onSave={handleSave}
        onClose={closeModal}
        onDelete={(h) => { setShowModal(false); setDeletingHoliday(h); }}
      />

      {/* ── Delete Confirmation Modal ── */}
      <DeleteConfirmModal
        open={!!deletingHoliday}
        itemName={deletingHoliday?.name}
        title="Delete this holiday?"
        description={
          <>
            <span style={{ fontWeight: 700, color: '#0F172A' }}>{deletingHoliday?.name}</span>{' '}
            will be permanently removed from the Holiday Calendar. This action cannot be undone.
          </>
        }
        onConfirm={() => handleDelete(deletingHoliday.id, deletingHoliday.name)}
        onCancel={() => setDeletingHoliday(null)}
      />

      {/* ── Result Modal (Success/Error) ── */}
      {resultModal.open && (
        <ResultModal
          type={resultModal.type}
          title={resultModal.title}
          message={resultModal.message}
          onClose={() => setResultModal(prev => ({ ...prev, open: false }))}
        />
      )}

      {/* ── Holiday Registry Modal (View All) ── */}
      <HolidayRegistryModal
        open={showRegistryModal}
        onClose={() => setShowRegistryModal(false)}
        registryGroups={registryGroups}
        totalCount={registryGroups.length}
        onEdit={(h) => { setShowRegistryModal(false); openEdit(h); }}
      />

      {/* ── Snackbar Toast ── */}
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
    </Box>
  );
}
