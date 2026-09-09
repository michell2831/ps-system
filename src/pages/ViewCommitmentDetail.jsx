import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  CircularProgress,
  Chip,
  Card
} from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Autorenew as AutorenewIcon,
  Lock as LockIcon,
  History as HistoryIcon,
  PictureAsPdf as PdfIcon,
  TableChart as CsvIcon
} from '@mui/icons-material';
import { useAppStore } from "../store/useAppStore";
import PageHeader from "../components/PageHeader";
import RequestRevisionModal from "../modals/RequestRevisionModal";
import ResultModal from "../modals/ResultModal";
import { exportCommitmentAsPdf, exportCommitmentAsCsv } from "../utils/commitmentExport";

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

export default function ViewCommitmentDetail({ commitmentId, onBack }) {
  const {
    services,
    kpis,
    periods,
    activeCommitment,
    fetchCommitmentById,
    fetchServices,
    fetchKpis,
    fetchPeriods,
    permissions
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [resultModal, setResultModal] = useState({ show: false, type: "success", title: "", message: "" });

  useEffect(() => {
    if (commitmentId) {
      setLoading(true);
      Promise.all([
        fetchCommitmentById(commitmentId),
        fetchServices(),
        fetchKpis(),
        fetchPeriods()
      ]).finally(() => {
        setLoading(false);
      });
    }
  }, [commitmentId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#F8FAFC', p: 4 }}>
        <CircularProgress sx={{ color: 'var(--maroon, #580000)' }} />
      </Box>
    );
  }

  const period = periods.find(p => p.id === activeCommitment?.period_id);
  const periodName = period ? period.name : "—";
  const items = activeCommitment?.items || [];

  return (
    <Box sx={{ p: 4, bgcolor: '#F8FAFC', minHeight: '100vh' }}>
      {/* Page Header with inline Back button */}
      <PageHeader
        breadcrumb="Commitments / Details"
        title={
          <Button
            startIcon={<ArrowBackIcon sx={{ fontSize: '1.1rem' }} />}
            onClick={onBack}
            variant="text"
            size="small"
            sx={{
              color: 'var(--maroon, #580000)',
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.95rem',
              py: 0.4,
              px: 0.5,
              minWidth: 0,
              borderRadius: '6px',
              letterSpacing: 0,
              '&:hover': {
                bgcolor: 'rgba(88,0,0,0.07)',
                textDecoration: 'none',
                color: 'var(--maroon, #800000)'
              }
            }}
          >
            Back to Registry
          </Button>
        }
      />

      {/* Main spreadsheet card */}
      <Card sx={{ borderRadius: '8px', border: '1px solid #E2E8F0', p: 3.5, bgcolor: '#FFFFFF', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', mt: 3 }}>

        {/* Detail Info Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3.5, pb: 2, borderBottom: '1px solid #F1F5F9', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            OPCR Commitment Registry Sheet
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ color: 'var(--maroon, #580000)', fontWeight: 800, fontSize: '0.8rem', bgcolor: 'var(--maroon-muted, #f2e8e8)', px: 2, py: 0.75, borderRadius: '9999px', border: '1px solid rgba(88,0,0,0.12)' }}>
              Evaluation Period: {periodName}
            </Typography>
            {activeCommitment?.version_number && (
              <Chip
                label={`Version ${activeCommitment.version_number}`}
                size="small"
                sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: '#F1F5F9', color: '#334155' }}
              />
            )}
            {activeCommitment?.status && (
              <Chip
                label={activeCommitment.status}
                size="small"
                icon={activeCommitment.status === 'Locked' ? <LockIcon sx={{ fontSize: '0.85rem !important' }} /> : <AutorenewIcon sx={{ fontSize: '0.85rem !important' }} />}
                sx={{
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  bgcolor: activeCommitment.status === 'Locked' ? '#ECFDF5' : '#FFFBEB',
                  color: activeCommitment.status === 'Locked' ? '#059669' : '#D97706',
                  border: activeCommitment.status === 'Locked' ? '1px solid rgba(5, 150, 105, 0.15)' : '1px solid rgba(217, 119, 6, 0.15)'
                }}
              />
            )}
            {activeCommitment?.status === "Locked" && permissions?.canRequestRevision && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<AutorenewIcon sx={{ fontSize: 16 }} />}
                onClick={() => setShowRevisionModal(true)}
                sx={{
                  color: '#D97706',
                  borderColor: 'rgba(217, 119, 6, 0.3)',
                  bgcolor: '#FFFBEB',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  textTransform: 'none',
                  borderRadius: '6px',
                  px: 1.5,
                  py: 0.4,
                  '&:hover': {
                    borderColor: '#D97706',
                    bgcolor: '#FEF3C7'
                  }
                }}
              >
                Request Revision
              </Button>
            )}

            <Button
              variant="outlined"
              size="small"
              startIcon={<PdfIcon sx={{ fontSize: 16 }} />}
              onClick={() => exportCommitmentAsPdf({
                commitment: activeCommitment,
                services,
                kpis,
                periodName
              })}
              sx={{
                color: '#DC2626',
                borderColor: 'rgba(220, 38, 38, 0.3)',
                bgcolor: '#FEF2F2',
                fontWeight: 700,
                fontSize: '0.78rem',
                textTransform: 'none',
                borderRadius: '6px',
                px: 1.5,
                py: 0.4,
                '&:hover': {
                  borderColor: '#DC2626',
                  bgcolor: '#FEE2E2'
                }
              }}
            >
              Export PDF
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={<CsvIcon sx={{ fontSize: 16 }} />}
              onClick={() => exportCommitmentAsCsv({
                commitment: activeCommitment,
                services,
                kpis,
                periodName
              })}
              sx={{
                color: '#059669',
                borderColor: 'rgba(5, 150, 105, 0.3)',
                bgcolor: '#ECFDF5',
                fontWeight: 700,
                fontSize: '0.78rem',
                textTransform: 'none',
                borderRadius: '6px',
                px: 1.5,
                py: 0.4,
                '&:hover': {
                  borderColor: '#059669',
                  bgcolor: '#D1FAE5'
                }
              }}
            >
              Export CSV
            </Button>
          </Box>
        </Box>

        {items.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', border: '1px solid #E2E8F0', boxShadow: 'none', borderRadius: '8px' }}>
            <Typography color="text.secondary" variant="body2">No commitments defined for this period.</Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: '8px', border: '1px solid #CBD5E1', boxShadow: 'none', overflow: 'hidden' }}>
            <Table sx={{ minWidth: 650, borderCollapse: 'separate', borderSpacing: 0 }}>
              <TableHead>
                {/* Spreadsheet Column Name Row (No A-F letter headers, index cell is blank) */}
                <TableRow>
                  <TableCell sx={{
                    textAlign: 'center',
                    bgcolor: '#580000',
                    borderRight: '1px solid rgba(255,255,255,0.15)',
                    borderBottom: '1px solid #CBD5E1',
                    width: 45,
                    py: 1.25
                  }} />
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', py: 1.25, px: 2, borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid #CBD5E1', bgcolor: '#580000' }}>SERVICE CHARTER</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', py: 1.25, px: 2, borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid #CBD5E1', bgcolor: '#580000' }}>CLASSIFICATION</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', py: 1.25, px: 2, borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid #CBD5E1', bgcolor: '#580000' }}>KPI INDICATOR</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', py: 1.25, px: 2, borderRight: '1px solid rgba(255,255,255,0.15)', borderBottom: '1px solid #CBD5E1', bgcolor: '#580000' }}>CATEGORY</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff', py: 1.25, px: 2, borderBottom: '1px solid #CBD5E1', bgcolor: '#580000' }} align="right">OPCR TARGET VALUE</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, idx) => {
                  const svc = services.find(s => String(s.id) === String(item.service_id));
                  const kpi = kpis.find(k => String(k.id) === String(item.kpi_id));

                  const isDuration = kpi ? ((kpi.category === "Timeliness" || kpi.category === "Efficiency") && kpi.unit !== "/ 5") : false;

                  let formattedValue = "—";
                  if (item.target_value !== null && item.target_value !== undefined) {
                    if (isDuration) {
                      formattedValue = formatDuration(item.target_value);
                    } else if (kpi?.unit === "/ 5") {
                      formattedValue = `${parseFloat(item.target_value)} / 5`;
                    } else if (kpi?.unit === "%" || kpi?.category === "Quality") {
                      formattedValue = `${parseFloat(item.target_value)}%`;
                    } else {
                      formattedValue = String(parseFloat(item.target_value));
                    }
                  }

                  // Classification chip styles
                  const cls = svc?.classification || "Simple";
                  let chipStyle = { color: "#10B981", bg: "#ECFDF5", border: "1px solid rgba(16, 185, 129, 0.15)" };
                  if (cls.toLowerCase().includes("technical")) {
                    chipStyle = { color: "#EF4444", bg: "#FEF2F2", border: "1px solid rgba(239, 68, 68, 0.15)" };
                  } else if (cls.toLowerCase().includes("complex")) {
                    chipStyle = { color: "#D97706", bg: "#FFFBEB", border: "1px solid rgba(217, 119, 6, 0.15)" };
                  }

                  const rowNum = idx + 1; // Rows start at 1 on the first item
                  const isLastRow = idx === items.length - 1;

                  // Premium interactive cell style helper
                  const getCellStyle = (extra = {}) => ({
                    py: 1.25,
                    px: 2,
                    borderRight: '1px solid #E2E8F0',
                    borderBottom: isLastRow ? 'none' : '1px solid #E2E8F0',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    '&:hover': {
                      bgcolor: 'rgba(88, 0, 0, 0.02)',
                      outline: '1.5px solid var(--maroon, #580000)',
                      outlineOffset: '-1.5px',
                      cursor: 'cell',
                      zIndex: 1
                    },
                    ...extra
                  });

                  return (
                    <TableRow
                      key={idx}
                      hover
                      sx={{
                        '&:hover .row-index-cell': {
                          bgcolor: 'rgba(88, 0, 0, 0.1)',
                          color: 'var(--maroon, #580000)',
                          transition: 'all 0.15s ease'
                        }
                      }}
                    >
                      {/* Row Index Column (1, 2, 3...) */}
                      <TableCell
                        className="row-index-cell"
                        sx={{
                          textAlign: 'center',
                          bgcolor: 'var(--maroon-muted, #f2e8e8)',
                          borderRight: '1px solid #CBD5E1',
                          borderBottom: isLastRow ? 'none' : '1px solid #CBD5E1',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          color: 'var(--maroon, #580000)',
                          width: 45,
                          py: 1.25,
                          userSelect: 'none'
                        }}
                      >
                        {rowNum}
                      </TableCell>

                      <TableCell sx={getCellStyle({ fontWeight: 600, color: '#1E293B' })}>
                        {svc?.name || "Unknown Service"}
                      </TableCell>

                      <TableCell sx={getCellStyle()}>
                        <Chip
                          label={cls}
                          size="small"
                          sx={{
                            color: chipStyle.color,
                            bgcolor: chipStyle.bg,
                            border: chipStyle.border,
                            fontWeight: 700,
                            fontSize: "11px",
                            px: 0.5
                          }}
                        />
                      </TableCell>

                      <TableCell sx={getCellStyle({ color: '#475569', fontWeight: 500 })}>
                        {kpi?.name || "Unknown KPI"}
                      </TableCell>

                      <TableCell sx={getCellStyle()}>
                        <Chip
                          label={kpi?.category || "—"}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            ...(kpi?.category === "Timeliness" && { bgcolor: '#EFF6FF', color: '#2563EB', border: '1px solid rgba(37, 99, 235, 0.15)' }),
                            ...(kpi?.category === "Quality" && { bgcolor: '#FFFBEB', color: '#D97706', border: '1px solid rgba(217, 119, 6, 0.15)' }),
                            ...(kpi?.category === "Efficiency" && { bgcolor: '#ECFDF5', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.15)' })
                          }}
                        />
                      </TableCell>

                      <TableCell align="right" sx={getCellStyle({ fontWeight: 600, color: '#475569', fontSize: '0.875rem', borderRight: 'none' })}>
                        {formattedValue}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Version History Section */}
        {activeCommitment?.versions?.length > 0 && (
          <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #E2E8F0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <HistoryIcon sx={{ fontSize: 20, color: '#475569' }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1E293B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Version History
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {activeCommitment.versions.map((ver, vIdx) => (
                <Box
                  key={ver.id || vIdx}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1.5,
                    bgcolor: '#F8FAFC',
                    borderRadius: '6px',
                    border: '1px solid #E2E8F0',
                    flexWrap: 'wrap',
                    gap: 1
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                    <Chip
                      label={`V${ver.version_number}`}
                      size="small"
                      sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: '#E2E8F0', color: '#1E293B' }}
                    />
                    <Chip
                      label={ver.status}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        bgcolor: ver.status === 'Locked' ? '#ECFDF5' : '#FFFBEB',
                        color: ver.status === 'Locked' ? '#047857' : '#D97706',
                        border: ver.status === 'Locked' ? '1px solid rgba(5, 150, 105, 0.15)' : '1px solid rgba(217, 119, 6, 0.15)'
                      }}
                    />
                    <Typography sx={{ fontSize: '0.8125rem', color: '#475569' }}>
                      {ver.revision_reason || "Initial locked commitment"}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                    {ver.created_at ? new Date(ver.created_at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                  </Typography>
                </Box>
              ))}

              {/* Current working version */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  bgcolor: '#EFF6FF',
                  borderRadius: '6px',
                  border: '1px solid #BFDBFE',
                  flexWrap: 'wrap',
                  gap: 1
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                  <Chip
                    label={`V${activeCommitment.version_number || 1}`}
                    size="small"
                    sx={{ fontWeight: 700, fontSize: '0.72rem', bgcolor: '#2563EB', color: '#FFFFFF' }}
                  />
                  <Chip
                    label={activeCommitment.status === 'Draft' ? 'Draft – Revision' : activeCommitment.status}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      bgcolor: '#DBEAFE',
                      color: '#1E40AF',
                      border: '1px solid rgba(37, 99, 235, 0.2)'
                    }}
                  />
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1E40AF' }}>
                    Current Active Version
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 700 }}>
                  Active
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Card>

      {showRevisionModal && activeCommitment && (
        <RequestRevisionModal
          open={showRevisionModal}
          commitment={activeCommitment}
          periodName={periodName}
          onClose={() => setShowRevisionModal(false)}
          onSuccess={async (newDraft) => {
            if (newDraft?.id) {
              await fetchCommitmentById(newDraft.id);
            } else {
              await fetchCommitmentById(commitmentId);
            }
            setResultModal({
              show: true,
              type: "success",
              title: "Revision Requested Successfully!",
              message: `A new Draft version (V${newDraft?.version_number || ((activeCommitment?.version_number || 1) + 1)}) has been created with all items copied from the locked version.`
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
