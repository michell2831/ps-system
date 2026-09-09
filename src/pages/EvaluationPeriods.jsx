import { useState, useEffect } from "react";
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Button,
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Paper,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    FormControlLabel,
    Snackbar,
    Alert,
    Tooltip,
    IconButton,
    Pagination,
    Select,
    InputAdornment,
    Menu,
    Divider
} from '@mui/material';
import {
    Add as AddIcon,
    Block as BlockIcon,
    CheckCircle as CheckCircleIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Search as SearchIcon,
    MoreHoriz as MoreHorizIcon,
    LockOutlined as LockOutlinedIcon
} from '@mui/icons-material';

import { useAppStore } from "../store/useAppStore";
import PageHeader from "../components/PageHeader";
import Toggle from "../components/Toggle";
import ResultModal from "../modals/ResultModal";

const mapTypeToBackend = (t) => {
    switch (t) {
        case "Quarterly": return "Quarterly";
        case "Semestral": return "Semester";
        case "Bi-Annual": return "BI_ANNUAL";
        case "Annual": return "Yearly";
        default: return "Semester";
    }
};

export default function EvaluationPeriods() {
    const {
        periods,
        fetchPeriods,
        createPeriod,
        updatePeriod,
        closePeriod,
        deletePeriod,
        commitments = [],
        fetchCommitments,
        permissions,
    } = useAppStore();

    const canWritePeriods = permissions?.canWritePeriods || false;

    const [showAdd, setShowAdd] = useState(false);
    const [closingPeriod, setClosingPeriod] = useState(null);
    const [deletingPeriod, setDeletingPeriod] = useState(null);
    const [editingPeriod, setEditingPeriod] = useState(null);
    const [menuAnchor, setMenuAnchor] = useState(null);

    const handleMenuOpen = (event, period) => {
        setMenuAnchor({ el: event.currentTarget, period });
    };
    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    // Edit Form states
    const [editName, setEditName] = useState("");
    const [editType, setEditType] = useState("Semestral");
    const [editStartDate, setEditStartDate] = useState("");
    const [editEndDate, setEditEndDate] = useState("");
    const [editErrors, setEditErrors] = useState({});

    // Add Form states
    const [name, setName] = useState("");
    const [type, setType] = useState("Bi-Annual");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [activeState, setActiveState] = useState(true);
    const [resultModal, setResultModal] = useState(null);
    const [periodErrors, setPeriodErrors] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    useEffect(() => {
        fetchPeriods();
        fetchCommitments();
    }, []);

    const hasDraftCommitment = commitments.some(c => c.status === "Draft");

    const activeExists = periods.some(p => p.status === "Active" || p.status === "Open");

    const handleOpenAdd = () => {
        setName("");
        setType("Bi-Annual");
        setStartDate("");
        setEndDate("");
        setActiveState(true);
        setPeriodErrors({});
        setShowAdd(true);
    };

    const handleOpenEdit = (p) => {
        setEditingPeriod(p);
        setEditName(p.name);
        setEditType(p.type);
        setEditStartDate(p.start_date ? p.start_date.split('T')[0] : "");
        setEditEndDate(p.end_date ? p.end_date.split('T')[0] : "");
        setEditErrors({});
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        const errs = {};
        if (!editName.trim()) errs.editName = "Period Name is required.";
        if (!editStartDate) errs.editStartDate = "Start Date is required.";
        if (!editEndDate) errs.editEndDate = "End Date is required.";
        if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }

        if (new Date(editStartDate) > new Date(editEndDate)) {
            setResultModal({
                type: "error",
                title: "Invalid Dates",
                message: "The end date cannot be earlier than the start date."
            });
            return;
        }

        const payload = {
            name: editName,
            period_type: mapTypeToBackend(editType),
            start_date: editStartDate,
            end_date: editEndDate,
        };

        try {
            await updatePeriod(editingPeriod.id, payload);
            setEditingPeriod(null);
            setResultModal({
                type: "success",
                title: "Period Updated",
                message: `Evaluation period '${editName}' has been updated successfully.`
            });
        } catch (err) {
            console.error(err);
            setResultModal({
                type: "error",
                title: "Failed to Update Period",
                message: err.message || "Failed to update evaluation period."
            });
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        // Check for any draft commitments in the system
        const hasDraft = commitments.some(c => c.status === "Draft");
        if (hasDraft) {
            setResultModal({
                type: "error",
                title: "Draft Commitment Found",
                message: "Please lock or submit all draft commitments before creating a new evaluation period."
            });
            return;
        }

        if (!name.trim() || !startDate || !endDate) {
            const errs = {};
            if (!name.trim()) errs.name = "Period Name is required.";
            if (!startDate) errs.startDate = "Start Date is required.";
            if (!endDate) errs.endDate = "End Date is required.";
            setPeriodErrors(errs);
            return;
        }
        setPeriodErrors({});

        if (new Date(startDate) > new Date(endDate)) {
            setResultModal({
                type: "error",
                title: "Invalid Dates",
                message: "The end date cannot be earlier than the start date."
            });
            return;
        }

        // The backend automatically determines if it should be Open or Queued based on existing periods.
        // So we don't need to block creation here anymore.

        const payload = {
            name,
            period_type: mapTypeToBackend(type),
            start_date: startDate,
            end_date: endDate,
        };

        try {
            await createPeriod(payload);
            setResultModal({
                type: "success",
                title: "Success",
                message: `Evaluation period '${name}' created successfully!`
            });
            setShowAdd(false);
        } catch (err) {
            console.error(err);
            setResultModal({
                type: "error",
                title: "Failed to Create Period",
                message: err.message || "Failed to create evaluation period"
            });
        }
    };

    const handleCloseConfirm = async () => {
        if (!closingPeriod) return;
        const closedName = closingPeriod.name;

        // Check if there is any draft commitment in this period
        const hasDraftInPeriod = commitments.some(
            c => c.status === "Draft" && String(c.period_id) === String(closingPeriod.id)
        );
        if (hasDraftInPeriod) {
            setClosingPeriod(null);
            setResultModal({
                type: "error",
                title: "Draft Commitment Found",
                message: `Cannot close the evaluation period "${closedName}" because there is still a draft commitment associated with it. Please lock or submit the commitment first.`
            });
            return;
        }

        try {
            // closePeriod already calls fetchPeriods() internally in the store
            await closePeriod(closingPeriod.id);
            setClosingPeriod(null);

            // Read the freshly-updated periods directly from store state
            // (avoids stale closure from the React component's periods variable)
            setTimeout(() => {
                const freshPeriods = useAppStore.getState().periods;
                const nextActivePeriod = freshPeriods.find(
                    p => (p.status === "Active" || p.status === "Open") && p.name !== closedName
                );

                if (nextActivePeriod) {
                    setResultModal({
                        type: "next",
                        title: "You are now in the next period",
                        message: `"${closedName}" has been closed. The system has automatically moved to the next evaluation period: "${nextActivePeriod.name}".`
                    });
                } else {
                    setResultModal({
                        type: "success",
                        title: "Period Closed Successfully",
                        message: `Evaluation period "${closedName}" is now closed. There are no queued periods to activate.`
                    });
                }
            }, 150);
        } catch (err) {
            console.error(err);
            setClosingPeriod(null);
            setResultModal({
                type: "error",
                title: "Failed to Close Period",
                message: err.message || "Failed to close evaluation period. Please try again."
            });
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deletingPeriod) return;
        try {
            await deletePeriod(deletingPeriod.id);
            setResultModal({
                type: "success",
                title: "Success",
                message: `Evaluation period "${deletingPeriod.name}" deleted successfully.`
            });
            setDeletingPeriod(null);
        } catch (err) {
            console.error(err);
            setResultModal({
                type: "error",
                title: "Failed to Delete Period",
                message: err.message || "Failed to delete evaluation period"
            });
        }
    };
    const filteredPeriods = (Array.isArray(periods) ? periods : []).filter(p => {
        if (!p) return false;
        const q = (searchQuery || "").toLowerCase();
        return (
            (p.name || "").toLowerCase().includes(q) ||
            (p.type || "").toLowerCase().includes(q) ||
            (p.status || "").toLowerCase().includes(q)
        );
    });

    const totalPages = Math.ceil(filteredPeriods.length / rowsPerPage) || 1;
    const paginatedPeriods = filteredPeriods.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    return (
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, bgcolor: '#F8FAFC', minHeight: '100vh' }}>
            {/* Top Header */}
            <PageHeader breadcrumb="Evaluation Periods" title="Evaluation Periods" subtitle="Create and manage evaluation cycles for performance tracking." />

            {/* Read-Only Notice for non-write roles */}
            {!canWritePeriods && (
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
                    Evaluation periods are managed by the Planning Officer. You have <strong>read-only</strong> access to this page.
                </Alert>
            )}

            {/* Search Card */}
            <Card sx={{ p: 2, mb: 3, borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        placeholder="Search period name..."
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
                                        <SearchIcon color="disabled" />
                                    </InputAdornment>
                                ),
                            },
                        }}
                        sx={{
                            width: { xs: canWritePeriods ? 'calc(50% - 6px)' : '100%', sm: 280 },
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '8px',
                                bgcolor: '#ffffff',
                                height: '40px',
                                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                            }
                        }}
                    />
                    {canWritePeriods && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                            onClick={handleOpenAdd}
                            sx={{
                                ml: { xs: 0, sm: 'auto' },
                                width: { xs: 'calc(50% - 6px)', sm: 'auto' },
                                height: '40px',
                                bgcolor: '#580000',
                                color: '#ffffff',
                                '&:hover': {
                                    bgcolor: '#700000',
                                    boxShadow: '0 4px 12px rgba(88, 0, 0, 0.25)',
                                },
                                borderRadius: '8px',
                                fontWeight: 600,
                                fontSize: { xs: '0.78rem', sm: '0.875rem' },
                                textTransform: 'none',
                                px: { xs: 1.5, sm: 2.5 },
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                boxShadow: '0 2px 4px rgba(88, 0, 0, 0.16)',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            Create Period
                        </Button>
                    )}
                </Box>
            </Card>

            {/* Main Table Card */}
            <Card sx={{ borderRadius: '8px', border: '1px solid #E2E8F0', mb: 3, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>

                <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#580000', '& .MuiTableCell-root': { py: 1.5, whiteSpace: 'nowrap' } }}>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>PERIOD NAME</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>CYCLE TYPE</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>START DATE</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>END DATE</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>STATUS</TableCell>
                                {canWritePeriods && (
                                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', width: 140 }}>ACTIONS</TableCell>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredPeriods.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={canWritePeriods ? 6 : 5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        {searchQuery
                                            ? 'No periods match your search query.'
                                            : !canWritePeriods
                                                ? 'No evaluation periods configured. Contact your Planning Officer.'
                                                : 'No evaluation periods defined. Click "Create Evaluation Period" to get started.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedPeriods.map((p) => {
                                    const startFmt = new Date(p.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                                    const endFmt = new Date(p.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                                    const isActive = p.status === "Active" || p.status === "Open";
                                    const isQueued = p.status === "Queued";
                                    const isClosed = p.status === "Closed" || p.status === "Completed";

                                    return (
                                        <TableRow
                                            key={p.id}
                                            hover
                                            sx={{
                                                opacity: isActive ? 1 : 0.7,
                                                '& .MuiTableCell-root': {
                                                    py: 1.5,
                                                    borderBottom: '1px solid #CBD5E1',
                                                    boxShadow: 'inset 0 -1.5px 0 0 rgba(0, 0, 0, 0.04)'
                                                }
                                            }}
                                        >
                                            <TableCell sx={{ fontWeight: 700, color: '#1E293B' }}>{p.name}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={p.type}
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 600,
                                                        ...(p.type === "Quarterly" && {
                                                            bgcolor: '#E8F5E9',
                                                            color: '#2E7D32',
                                                            border: '1px solid rgba(46, 125, 50, 0.15)'
                                                        }),
                                                        ...(p.type === "Semestral" && {
                                                            bgcolor: '#FFF3E0',
                                                            color: '#F57C00',
                                                            border: '1px solid rgba(245, 124, 0, 0.15)'
                                                        }),
                                                        ...(p.type === "Bi-Annual" && {
                                                            bgcolor: '#F3E8FF',
                                                            color: '#7C3AED',
                                                            border: '1px solid rgba(124, 58, 237, 0.15)'
                                                        }),
                                                        ...(p.type === "Annual" && {
                                                            bgcolor: '#E3F2FD',
                                                            color: '#1565C0',
                                                            border: '1px solid rgba(21, 101, 192, 0.15)'
                                                        }),
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 500 }}>{startFmt}</TableCell>
                                            <TableCell sx={{ fontWeight: 500 }}>{endFmt}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={p.status === "Open" ? "Active" : p.status}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: isActive ? '#ECFDF5' : (isQueued ? '#FFFBEB' : '#F1F5F9'),
                                                        color: isActive ? '#059669' : (isQueued ? '#D97706' : '#64748B'),
                                                        border: isActive ? '1px solid rgba(5, 150, 105, 0.15)' : (isQueued ? '1px solid rgba(217, 119, 6, 0.15)' : '1px solid rgba(100, 116, 139, 0.1)'),
                                                        fontWeight: 600,
                                                    }}
                                                />
                                            </TableCell>
                                            {canWritePeriods && (
                                                <TableCell align="center">
                                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                                        {isActive && (
                                                            <Button
                                                                variant="contained"
                                                                size="small"
                                                                onClick={() => setClosingPeriod(p)}
                                                                sx={{
                                                                    bgcolor: '#059669',
                                                                    '&:hover': { bgcolor: '#047857' },
                                                                    textTransform: 'none',
                                                                    fontWeight: 600,
                                                                    fontSize: '0.75rem',
                                                                    borderRadius: 1.5,
                                                                    px: 2,
                                                                    py: 0.5
                                                                }}
                                                            >
                                                                Complete
                                                            </Button>
                                                        )}
                                                        {isQueued && (
                                                            <Tooltip title="Actions">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={(e) => { e.stopPropagation(); handleMenuOpen(e, p); }}
                                                                    sx={{
                                                                        color: 'text.secondary',
                                                                        '&:hover': { bgcolor: '#F1F5F9' }
                                                                    }}
                                                                >
                                                                    <MoreHorizIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        {isClosed && (
                                                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', py: 0.5, px: 1 }}>
                                                                Completed
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

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

            {/* Add Period Modal Dialog */}
            <Dialog
                open={showAdd}
                onClose={(e, reason) => {
                    if (reason !== "backdropClick") {
                        setShowAdd(false);
                    }
                }}
                sx={{ '& .MuiDialog-paper': { maxWidth: '440px', width: '100%', borderRadius: 3, p: 2 } }}
            >
                <DialogTitle sx={{ fontWeight: 500, fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.35rem', pb: 1 }}>
                    Create Evaluation Period
                </DialogTitle>
                <DialogContent sx={{ p: 2, pt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="Period Name"
                        placeholder="e.g. 1st Semester AY 2026-2027"
                        required
                        fullWidth
                        size="small"
                        value={name}
                        error={!!periodErrors.name}
                        helperText={periodErrors.name || ''}
                        onChange={(e) => { setName(e.target.value); setPeriodErrors(prev => ({ ...prev, name: '' })); }}
                        sx={{ mt: 1, '& .MuiFormLabel-asterisk': { color: '#ef4444' } }}
                    />

                    <TextField
                        select
                        label="Evaluation Cycle Type"
                        required
                        fullWidth
                        size="small"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        sx={{ '& .MuiFormLabel-asterisk': { color: '#ef4444' } }}
                    >
                        <MenuItem value="Quarterly">Quarterly Review Cycle</MenuItem>
                        <MenuItem value="Semestral">Semestral Academic Cycle</MenuItem>
                        <MenuItem value="Bi-Annual">Bi-Annual Review Cycle</MenuItem>
                        <MenuItem value="Annual">Annual Review Cycle</MenuItem>
                    </TextField>

                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Box>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                                    START DATE <span style={{ color: '#ef4444' }}>*</span>
                                </Typography>
                                <TextField
                                    type="date"
                                    fullWidth
                                    size="small"
                                    value={startDate}
                                    error={!!periodErrors.startDate}
                                    helperText={periodErrors.startDate || ''}
                                    onChange={(e) => { setStartDate(e.target.value); setPeriodErrors(prev => ({ ...prev, startDate: '' })); }}
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={6}>
                            <Box>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                                    END DATE <span style={{ color: '#ef4444' }}>*</span>
                                </Typography>
                                <TextField
                                    type="date"
                                    fullWidth
                                    size="small"
                                    value={endDate}
                                    error={!!periodErrors.endDate}
                                    helperText={periodErrors.endDate || ''}
                                    onChange={(e) => { setEndDate(e.target.value); setPeriodErrors(prev => ({ ...prev, endDate: '' })); }}
                                />
                            </Box>
                        </Grid>
                    </Grid>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1 }}>
                        <Toggle
                            checked={activeExists ? false : activeState}
                            onChange={() => !activeExists && setActiveState(p => !p)}
                            disabled={activeExists}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 700, color: activeExists ? "text.disabled" : "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            ACTIVE
                        </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
                        {activeExists
                            ? "An active period already exists. This new period will be saved as Queued and will automatically open when the current active period is closed."
                            : "Only one evaluation period can be active at a time per office profile to maintain data consistency."}
                    </Typography>


                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button variant="outlined" color="inherit" onClick={() => setShowAdd(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        sx={{ bgcolor: '#15803D', '&:hover': { bgcolor: '#166534' }, fontWeight: 600 }}
                    >
                        Create Period
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Close Period Confirmation Modal */}
            <Dialog
                open={Boolean(closingPeriod)}
                onClose={(e, reason) => {
                    if (reason !== "backdropClick") {
                        setClosingPeriod(null);
                    }
                }}
                sx={{ '& .MuiDialog-paper': { maxWidth: '420px', width: '100%', borderRadius: 3, p: 2 } }}
            >
                <DialogTitle sx={{ fontWeight: 500, fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.35rem', pb: 1 }}>
                    Close Period?
                </DialogTitle>
                <DialogContent sx={{ p: 2 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                        Are you sure you want to close the evaluation period{" "}
                        <strong style={{ color: "#800000" }}>"{closingPeriod?.name}"</strong>?
                        <br />
                        <br />
                        Closing an evaluation period is permanent. All associated commitments, scores, and performance appraisals for this period will be archived and locked from active updates.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button variant="outlined" color="inherit" onClick={() => setClosingPeriod(null)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCloseConfirm}
                        variant="contained"
                        sx={{ bgcolor: '#D97706', '&:hover': { bgcolor: '#B45309' }, fontWeight: 600 }}
                    >
                        Yes, Close Period
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Period Modal */}
            <Dialog
                open={Boolean(editingPeriod)}
                onClose={(e, reason) => {
                    if (reason !== "backdropClick") {
                        setEditingPeriod(null);
                    }
                }}
                sx={{ '& .MuiDialog-paper': { maxWidth: '440px', width: '100%', borderRadius: 3, p: 2 } }}
            >
                <DialogTitle sx={{ fontWeight: 500, fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.35rem', pb: 1 }}>
                    Edit Evaluation Period
                </DialogTitle>
                <DialogContent sx={{ p: 2, pt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="Period Name"
                        required
                        fullWidth
                        size="small"
                        value={editName}
                        error={!!editErrors.editName}
                        helperText={editErrors.editName || ''}
                        onChange={(e) => { setEditName(e.target.value); setEditErrors(prev => ({ ...prev, editName: '' })); }}
                        sx={{ mt: 1, '& .MuiFormLabel-asterisk': { color: '#ef4444' } }}
                    />

                    <TextField
                        select
                        label="Evaluation Cycle Type"
                        required
                        fullWidth
                        size="small"
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        sx={{ '& .MuiFormLabel-asterisk': { color: '#ef4444' } }}
                    >
                        <MenuItem value="Quarterly">Quarterly Review Cycle</MenuItem>
                        <MenuItem value="Semestral">Semestral Academic Cycle</MenuItem>
                        <MenuItem value="Bi-Annual">Bi-Annual Review Cycle</MenuItem>
                        <MenuItem value="Annual">Annual Review Cycle</MenuItem>
                    </TextField>

                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <Box>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                                    START DATE <span style={{ color: '#ef4444' }}>*</span>
                                </Typography>
                                <TextField
                                    type="date"
                                    fullWidth
                                    size="small"
                                    value={editStartDate}
                                    error={!!editErrors.editStartDate}
                                    helperText={editErrors.editStartDate || ''}
                                    onChange={(e) => { setEditStartDate(e.target.value); setEditErrors(prev => ({ ...prev, editStartDate: '' })); }}
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={6}>
                            <Box>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                                    END DATE <span style={{ color: '#ef4444' }}>*</span>
                                </Typography>
                                <TextField
                                    type="date"
                                    fullWidth
                                    size="small"
                                    value={editEndDate}
                                    error={!!editErrors.editEndDate}
                                    helperText={editErrors.editEndDate || ''}
                                    onChange={(e) => { setEditEndDate(e.target.value); setEditErrors(prev => ({ ...prev, editEndDate: '' })); }}
                                />
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button variant="outlined" color="inherit" onClick={() => setEditingPeriod(null)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleEditSave}
                        variant="contained"
                        sx={{ bgcolor: '#15803D', '&:hover': { bgcolor: '#166534' }, fontWeight: 600 }}
                    >
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog
                open={Boolean(deletingPeriod)}
                onClose={(e, reason) => {
                    if (reason !== "backdropClick") {
                        setDeletingPeriod(null);
                    }
                }}
                fullWidth
                maxWidth="xs"
                PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
            >
                <DialogTitle sx={{ fontWeight: 500, fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.35rem', pb: 1 }}>
                    Delete Evaluation Period?
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                        Are you sure you want to delete the queued evaluation period{" "}
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>"{deletingPeriod?.name}"</span>?
                        <br />
                        <br />
                        This will remove the queued period from the registry.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
                    <Button variant="outlined" color="inherit" onClick={() => setDeletingPeriod(null)}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleDeleteConfirm}
                        sx={{ bgcolor: '#DC2626', '&:hover': { bgcolor: '#B91C1C' }, fontWeight: 600, textTransform: 'none' }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Actions Dropdown Menu */}
            <Menu
                anchorEl={menuAnchor?.el}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 2,
                            boxShadow: '0 4px 20px 0 rgba(0,0,0,0.08)',
                            border: '1px solid #E2E8F0',
                            minWidth: 150
                        }
                    }
                }}
            >
                <MenuItem
                    onClick={() => {
                        if (menuAnchor?.period) {
                            handleOpenEdit(menuAnchor.period);
                        }
                        handleMenuClose();
                    }}
                    sx={{
                        py: 1,
                        px: 2,
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        color: '#1E293B',
                        '&:hover': { bgcolor: '#F8FAFC' }
                    }}
                >
                    <EditIcon fontSize="small" sx={{ color: '#800000' }} />
                    Edit Period
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (menuAnchor?.period) {
                            setDeletingPeriod(menuAnchor.period);
                        }
                        handleMenuClose();
                    }}
                    sx={{
                        py: 1,
                        px: 2,
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        color: '#EF4444',
                        '&:hover': { bgcolor: '#FEF2F2' }
                    }}
                >
                    <DeleteIcon fontSize="small" sx={{ color: '#EF4444' }} />
                    Delete Period
                </MenuItem>
            </Menu>

            {/* Result Modal for Success/Error */}
            {resultModal && (
                <ResultModal
                    type={resultModal.type}
                    title={resultModal.title}
                    message={resultModal.message}
                    onClose={() => setResultModal(null)}
                />
            )}

        </Box>
    );
}