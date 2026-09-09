import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
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
  Menu,
  MenuItem,
  Divider,
  TextField,
  InputAdornment
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  MoreHoriz as MoreHorizIcon,
  Lock as LockIcon,
  EditNote as DraftIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  AssignmentTurnedIn as RegistryIcon,
  Search as SearchIcon,
  Autorenew as AutorenewIcon,
  PictureAsPdf as PdfIcon,
  TableChart as CsvIcon
} from "@mui/icons-material";
import { useAppStore } from "../store/useAppStore";
import PageHeader from "../components/PageHeader";
import CommitmentWizardModal from "../modals/CommitmentWizardModal";
import RequestRevisionModal from "../modals/RequestRevisionModal";
import ViewCommitmentDetail from "./ViewCommitmentDetail";
import ResultModal from "../modals/ResultModal";
import { exportCommitmentAsPdf, exportCommitmentAsCsv } from "../utils/commitmentExport";

export default function OPCRCommitments() {
  const {
    commitments,
    periods,
    fetchCommitments,
    fetchPeriods,
    userRole,
    permissions,
    services,
    kpis,
    fetchServices,
    fetchKpis,
  } = useAppStore();

  const [showWizard, setShowWizard] = useState(false);
  const [selectedCommitmentId, setSelectedCommitmentId] = useState(null);
  const [wizardReadOnly, setWizardReadOnly] = useState(false);
  const [showViewDetails, setShowViewDetails] = useState(false);
  const [viewCommitmentId, setViewCommitmentId] = useState(null);
  const [resultModal, setResultModal] = useState({ show: false, type: "success", title: "", message: "" });
  const [searchQuery, setSearchQuery] = useState("");

  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionCommitment, setRevisionCommitment] = useState(null);

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCommitment, setSelectedCommitment] = useState(null);

  const handleMenuOpen = (event, commitment) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedCommitment(commitment);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    if (selectedCommitment) {
      setSelectedCommitmentId(selectedCommitment.id);
      setWizardReadOnly(false);
      setShowWizard(true);
    }
    handleMenuClose();
  };

  const handleViewClick = () => {
    if (selectedCommitment) {
      setViewCommitmentId(selectedCommitment.id);
      setShowViewDetails(true);
    }
    handleMenuClose();
  };

  const handleRequestRevisionClick = () => {
    if (selectedCommitment) {
      setRevisionCommitment(selectedCommitment);
      setShowRevisionModal(true);
    }
    handleMenuClose();
  };

  const handleExportPdfClick = async () => {
    if (selectedCommitment) {
      const c = selectedCommitment;
      handleMenuClose();
      await exportCommitmentAsPdf({
        commitment: c,
        services,
        kpis,
        periodName: getPeriodName(c.period_id)
      });
    } else {
      handleMenuClose();
    }
  };

  const handleExportCsvClick = async () => {
    if (selectedCommitment) {
      const c = selectedCommitment;
      handleMenuClose();
      await exportCommitmentAsCsv({
        commitment: c,
        services,
        kpis,
        periodName: getPeriodName(c.period_id)
      });
    } else {
      handleMenuClose();
    }
  };

  // Only OPCR Evaluator can write commitments
  const canWriteCommitments = permissions?.canWriteCommitments || false;

  // Determine if a locked commitment already exists for the active period
  const activePeriod = periods.find(p => p.status === 'Active' || p.status === 'Open');
  const lockedCommitmentForActivePeriod = activePeriod
    ? commitments.find(c => String(c.period_id) === String(activePeriod.id) && c.status === 'Locked')
    : null;
  const draftCommitmentForActivePeriod = activePeriod
    ? commitments.find(c => String(c.period_id) === String(activePeriod.id) && c.status === 'Draft')
    : null;
  const isCreateBlocked = canWriteCommitments && !!lockedCommitmentForActivePeriod && !draftCommitmentForActivePeriod;

  useEffect(() => {
    fetchPeriods();
    fetchCommitments();
    fetchServices();
    fetchKpis();
  }, []);

  const getPeriodName = (periodId) => {
    const p = periods.find(p => p.id === periodId);
    return p ? p.name : "Unknown Period";
  };

  const getOfficeMeta = (office) => {
    if (!office) return { name: "Campus Academic Office", short: "ACAD", color: "#B45309", bg: "#FFFBEB", border: "#FDE68A" };
    const s = String(office).toUpperCase();
    if (s.includes("ACAD")) {
      return { name: "Campus Academic Office", short: "ACAD", color: "#B45309", bg: "#FFFBEB", border: "#FDE68A" };
    }
    if (s.includes("OSAS") || s.includes("STUDENT")) {
      return { name: "Campus Student Services and Affairs Office", short: "OSAS", color: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE" };
    }
    if (s.includes("ADMIN")) {
      return { name: "Campus Administrative Office", short: "ADMIN", color: "#065F46", bg: "#ECFDF5", border: "#A7F3D0" };
    }
    return { name: office, short: office.slice(0, 4).toUpperCase(), color: "#475569", bg: "#F1F5F9", border: "#CBD5E1" };
  };

  const filteredCommitments = commitments.filter(c => {
    const periodName = getPeriodName(c.period_id).toLowerCase();
    const status = (c.status || "").toLowerCase();
    const office = (c.office || "").toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    return periodName.includes(q) || status.includes(q) || office.includes(q);
  });

  if (showViewDetails && viewCommitmentId) {
    return (
      <ViewCommitmentDetail
        commitmentId={viewCommitmentId}
        onBack={() => {
          setShowViewDetails(false);
          setViewCommitmentId(null);
        }}
      />
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, bgcolor: '#F8FAFC', minHeight: '100vh' }}>
      <PageHeader breadcrumb="Commitments" title="OPCR Commitments" subtitle="View and manage your office performance commitment reports." />

      {/* Search Card */}
      <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, flexWrap: 'wrap', alignItems: 'flex-end', mb: 3 }}>

        {/* Search Field */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: { xs: canWriteCommitments ? 'calc(50% - 6px)' : (searchQuery ? 'calc(50% - 6px)' : '100%'), sm: 'auto' } }}>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Search Period
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
              width: { xs: '100%', sm: 240 },
              '& .MuiOutlinedInput-root': {
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                height: '38px',
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                color: '#1E293B',
                '& fieldset': { borderColor: '#CBD5E1' },
                '&:hover fieldset': { borderColor: '#94A3B8' },
                '&.Mui-focused fieldset': { borderColor: '#64748B', borderWidth: '1px' },
              }
            }}
          />
        </Box>

        {/* Reset Filters */}
        {searchQuery && (
          <Button
            variant="outlined"
            onClick={() => setSearchQuery("")}
            sx={{
              height: '38px',
              textTransform: 'none',
              borderColor: '#E2E8F0',
              color: '#475569',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: { xs: '0.78rem', sm: '0.875rem' },
              width: { xs: 'calc(50% - 6px)', sm: 'auto' },
              px: { xs: 1.5, sm: 2 },
              '&:hover': {
                borderColor: '#CBD5E1',
                backgroundColor: '#F8FAFC',
              }
            }}
          >
            Reset Filters
          </Button>
        )}

        {/* Create Button */}
        {canWriteCommitments && (
          <Box sx={{ ml: { xs: 0, sm: 'auto' }, width: { xs: searchQuery ? '100%' : 'calc(50% - 6px)', sm: 'auto' } }}>
            <Tooltip
              title={
                isCreateBlocked
                  ? `A locked commitment already exists for "${activePeriod?.name}". Only one commitment per period is allowed.`
                  : ""
              }
              arrow
              disableHoverListener={!isCreateBlocked}
            >
              <Box sx={{ width: '100%' }}>
                <Button
                  variant="contained"
                  fullWidth
                  disabled={isCreateBlocked}
                  startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                  onClick={() => {
                    if (draftCommitmentForActivePeriod) {
                      setSelectedCommitmentId(draftCommitmentForActivePeriod.id);
                    } else {
                      setSelectedCommitmentId(null);
                    }
                    setWizardReadOnly(false);
                    setShowWizard(true);
                  }}
                  sx={{
                    height: '38px',
                    bgcolor: isCreateBlocked ? undefined : '#580000',
                    color: '#ffffff',
                    '&:hover': {
                      bgcolor: isCreateBlocked ? undefined : '#700000',
                      boxShadow: isCreateBlocked ? undefined : '0 4px 12px rgba(88, 0, 0, 0.25)',
                    },
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: { xs: '0.78rem', sm: '0.875rem' },
                    textTransform: 'none',
                    px: { xs: 1.5, sm: 2.5 },
                    whiteSpace: 'nowrap',
                    boxShadow: isCreateBlocked ? 'none' : '0 2px 4px rgba(88, 0, 0, 0.16)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Create / Edit Commitment
                </Button>
              </Box>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Main Table Card */}
      <Card sx={{ borderRadius: "8px", border: '1px solid #E2E8F0', mb: 3, boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" }}>
        <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#580000', '& .MuiTableCell-root': { py: 1.5, whiteSpace: 'nowrap' } }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', pl: 3 }}>PERIOD</TableCell>
                {permissions?.canSeeOtherOffices && (
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>OFFICE</TableCell>
                )}
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>LAST UPDATED</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', width: 220 }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCommitments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={permissions?.canSeeOtherOffices ? 5 : 4} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    {searchQuery ? "No commitments match your search query." : "No commitments found. Click \"Create / Edit Commitment\" to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCommitments.map((c) => {
                  const updatedFmt = new Date(c.updated_at || c.created_at).toLocaleString("en-US", {
                    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
                  });
                  const isLocked = c.status === "Locked";
                  const isRevisionRequested = c.status === "Revision Requested";
                  const isDraft = c.status === "Draft";
                  const period = periods.find(p => p.id === c.period_id);
                  const periodName = period ? period.name : "Unknown Period";
                  const periodDates = period
                    ? `${new Date(period.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(period.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : "";
                  const cycleType = period ? period.type : "";
                  const officeMeta = getOfficeMeta(c.office || c.office_name);

                  return (
                    <TableRow
                      key={c.id}
                      hover
                      onClick={() => {
                        setViewCommitmentId(c.id);
                        setShowViewDetails(true);
                      }}
                      sx={{
                        cursor: 'pointer',
                        borderLeft: `4px solid ${isLocked ? '#10B981' : isRevisionRequested ? '#3B82F6' : '#F59E0B'}`,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'rgba(248, 250, 252, 0.95)',
                          transform: 'translateX(2px)'
                        },
                        '& .MuiTableCell-root': {
                          py: 2,
                          borderBottom: '1px solid #CBD5E1',
                          boxShadow: 'inset 0 -1.5px 0 0 rgba(0, 0, 0, 0.02)'
                        }
                      }}
                    >
                      <TableCell sx={{ pl: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '8px',
                            bgcolor: isLocked ? 'rgba(16, 185, 129, 0.08)' : isRevisionRequested ? 'rgba(59, 130, 246, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isLocked ? '#10B981' : isRevisionRequested ? '#2563EB' : '#F59E0B'
                          }}>
                            <CalendarIcon sx={{ fontSize: 18 }} />
                          </Box>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ fontWeight: 700, color: '#1E293B', fontSize: '0.9rem' }}>
                                {periodName}
                              </Typography>
                              {c.version_number && (
                                <Chip
                                  label={`V${c.version_number}${isDraft && c.version_number > 1 ? ' (Revision)' : ''}`}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    bgcolor: c.version_number > 1 ? '#EFF6FF' : '#F1F5F9',
                                    color: c.version_number > 1 ? '#2563EB' : '#475569',
                                  }}
                                />
                              )}
                              {cycleType && (
                                <Chip
                                  label={cycleType}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    bgcolor: '#F1F5F9',
                                    color: '#475569',
                                  }}
                                />
                              )}
                            </Box>
                            {periodDates && (
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                                {periodDates}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      {permissions?.canSeeOtherOffices && (
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '6px',
                                bgcolor: officeMeta.bg,
                                border: `1px solid ${officeMeta.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.7rem',
                                color: officeMeta.color,
                                flexShrink: 0,
                              }}
                            >
                              {officeMeta.short}
                            </Box>
                            <Typography sx={{ fontWeight: 600, color: '#1E293B', fontSize: '0.85rem' }}>
                              {officeMeta.name}
                            </Typography>
                          </Box>
                        </TableCell>
                      )}
                      <TableCell>
                        <Chip
                          label={c.status}
                          size="small"
                          icon={
                            isLocked
                              ? <LockIcon sx={{ fontSize: '0.85rem !important', color: 'inherit' }} />
                              : isRevisionRequested
                              ? <AutorenewIcon sx={{ fontSize: '0.85rem !important', color: 'inherit' }} />
                              : <DraftIcon sx={{ fontSize: '0.85rem !important', color: 'inherit' }} />
                          }
                          sx={{
                            bgcolor: isLocked ? '#ECFDF5' : isRevisionRequested ? '#EFF6FF' : '#FFFBEB',
                            color: isLocked ? '#059669' : isRevisionRequested ? '#1D4ED8' : '#D97706',
                            border: isLocked
                              ? '1px solid rgba(5, 150, 105, 0.15)'
                              : isRevisionRequested
                              ? '1px solid rgba(29, 78, 216, 0.2)'
                              : '1px solid rgba(217, 119, 6, 0.15)',
                            fontWeight: 700,
                            px: 1,
                            '& .MuiChip-icon': {
                              color: 'inherit'
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                          <TimeIcon sx={{ fontSize: 16, opacity: 0.7 }} />
                          <Typography sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
                            {updatedFmt}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <Tooltip title="Actions" arrow>
                            <IconButton
                              size="small"
                              onClick={(e) => handleMenuOpen(e, c)}
                              sx={{
                                color: 'text.secondary',
                                '&:hover': {
                                  bgcolor: '#F1F5F9',
                                },
                                width: 32,
                                height: 32
                              }}
                            >
                              <MoreHorizIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {showWizard && (
        <CommitmentWizardModal
          open={showWizard}
          commitmentId={selectedCommitmentId}
          readOnly={wizardReadOnly}
          onClose={(saved) => {
            setShowWizard(false);
            setSelectedCommitmentId(null);
            setWizardReadOnly(false);
            fetchCommitments();
            if (saved === true) {
              setResultModal({
                show: true,
                type: "success",
                title: "Draft Saved Successfully!",
                message: "Your commitment draft has been saved successfully."
              });
            } else if (saved === 'locked') {
              setResultModal({
                show: true,
                type: "success",
                title: "Commitment Locked & Submitted!",
                message: "Your commitment has been locked and submitted successfully."
              });
            }
          }}
        />
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        TransitionProps={{
          onExited: () => setSelectedCommitment(null)
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              minWidth: 190,
              borderRadius: '10px',
              p: '6px',
              mt: 0.5,
              border: '1px solid #E2E8F0',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
              '& .MuiMenuItem-root': {
                py: 1.1,
                px: 1.5,
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 500,
                color: '#334155',
                gap: 1.25,
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: '#F8FAFC',
                  color: '#0F172A',
                },
              },
            },
          },
        }}
      >
        {selectedCommitment && !(selectedCommitment.status === "Locked") && canWriteCommitments && (
          <>
            <MenuItem onClick={handleEditClick}>
              <EditIcon sx={{ color: '#800000', fontSize: 18 }} />
              <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>Edit Draft</Typography>
            </MenuItem>
            <Divider sx={{ my: '4px !important', borderColor: '#F1F5F9' }} />
          </>
        )}

        {selectedCommitment && selectedCommitment.status === "Locked" && permissions?.canRequestRevision && (
          <>
            <MenuItem onClick={handleRequestRevisionClick}>
              <AutorenewIcon sx={{ color: '#D97706', fontSize: 18 }} />
              <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>Request Revision</Typography>
            </MenuItem>
            <Divider sx={{ my: '4px !important', borderColor: '#F1F5F9' }} />
          </>
        )}

        <MenuItem onClick={handleExportPdfClick}>
          <PdfIcon sx={{ color: '#DC2626', fontSize: 18 }} />
          <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>Download PDF</Typography>
        </MenuItem>

        <MenuItem onClick={handleExportCsvClick}>
          <CsvIcon sx={{ color: '#059669', fontSize: 18 }} />
          <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 500 }}>Download CSV</Typography>
        </MenuItem>
      </Menu>

      {showRevisionModal && revisionCommitment && (
        <RequestRevisionModal
          open={showRevisionModal}
          commitment={revisionCommitment}
          periodName={getPeriodName(revisionCommitment.period_id)}
          onClose={() => {
            setShowRevisionModal(false);
            setRevisionCommitment(null);
          }}
          onSuccess={async (newDraft) => {
            await fetchCommitments();
            setResultModal({
              show: true,
              type: "success",
              title: "Revision Requested Successfully!",
              message: `A new Draft version (V${newDraft?.version_number || ((revisionCommitment.version_number || 1) + 1)}) has been created with all items copied from the locked version.`
            });
          }}
        />
      )}

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
