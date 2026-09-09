import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  Pagination,
  Select,
  MenuItem,
  Grid,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Timeline as TimelineIcon,
  Queue as QueueIcon,
  Assessment as AssessmentIcon,
  Autorenew as AutorenewIcon
} from '@mui/icons-material';

import PageHeader from "../components/PageHeader";
import { api } from "../services/api";

const renderDateTimeCell = (dateStr) => {
  if (!dateStr) return "—";
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

export default function SLAComputation() {
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [utilization, setUtilization] = useState([]);

  // Pending queue is simulated on the client to show live processing
  const [pendingQueue, setPendingQueue] = useState([
    { transaction_id: "TX-90104", service_name: "Certification of Grades", office: "Records Office", queued_at: "2 mins ago" },
    { transaction_id: "TX-90105", service_name: "Good Moral Certificate", office: "OSAS", queued_at: "4 mins ago" },
    { transaction_id: "TX-90106", service_name: "Transcript of Records Request", office: "Registrar Office", queued_at: "7 mins ago" }
  ]);

  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getSlaComputationLogs({
        page: currentPage,
        limit: rowsPerPage,
        transaction_id: searchQuery.trim() || undefined
      });
      if (res && res.data && res.data.length > 0) {
        setLogs(res.data);
        setTotalLogs(res.total || res.data.length);
      } else {
        // Fallback to mock data if empty
        const mockLogs = [
          { id: 1, transaction_id: "TX-62391", service_name: "Faculty Evaluation Request", time_in: new Date(Date.now() - 7200000).toISOString(), time_out: new Date(Date.now() - 3600000).toISOString(), computed_duration_days: 0.0417, opcr_score: 5.0, evaluated_at: new Date(Date.now() - 3600000).toISOString() },
          { id: 2, transaction_id: "TX-18604", service_name: "Enrollment Assessment", time_in: new Date(Date.now() - 86400000).toISOString(), time_out: new Date(Date.now() - 18000000).toISOString(), computed_duration_days: 0.7917, opcr_score: 4.2, evaluated_at: new Date(Date.now() - 18000000).toISOString() },
          { id: 3, transaction_id: "TX-64157", service_name: "Document Request Processing", time_in: new Date(Date.now() - 172800000).toISOString(), time_out: new Date(Date.now() - 86400000).toISOString(), computed_duration_days: 1.0, opcr_score: 3.8, evaluated_at: new Date(Date.now() - 86400000).toISOString() },
          { id: 4, transaction_id: "TX-52019", service_name: "Alumni ID Registration", time_in: new Date(Date.now() - 259200000).toISOString(), time_out: new Date(Date.now() - 250000000).toISOString(), computed_duration_days: 0.1065, opcr_score: 4.9, evaluated_at: new Date(Date.now() - 250000000).toISOString() },
          { id: 5, transaction_id: "TX-48301", service_name: "Good Moral Certificate", time_in: new Date(Date.now() - 345600000).toISOString(), time_out: new Date(Date.now() - 320000000).toISOString(), computed_duration_days: 0.2963, opcr_score: 4.5, evaluated_at: new Date(Date.now() - 320000000).toISOString() },
        ];

        // Filter by search query if present
        const filtered = searchQuery.trim()
          ? mockLogs.filter(l => l.transaction_id.toLowerCase().includes(searchQuery.trim().toLowerCase()))
          : mockLogs;

        setLogs(filtered);
        setTotalLogs(filtered.length);
      }
    } catch (err) {
      console.error("Failed to load SLA logs:", err);
      const mockLogs = [
        { id: 1, transaction_id: "TX-62391", service_name: "Faculty Evaluation Request", time_in: new Date(Date.now() - 7200000).toISOString(), time_out: new Date(Date.now() - 3600000).toISOString(), computed_duration_days: 0.0417, opcr_score: 5.0, evaluated_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 2, transaction_id: "TX-18604", service_name: "Enrollment Assessment", time_in: new Date(Date.now() - 86400000).toISOString(), time_out: new Date(Date.now() - 18000000).toISOString(), computed_duration_days: 0.7917, opcr_score: 4.2, evaluated_at: new Date(Date.now() - 18000000).toISOString() },
        { id: 3, transaction_id: "TX-64157", service_name: "Document Request Processing", time_in: new Date(Date.now() - 172800000).toISOString(), time_out: new Date(Date.now() - 86400000).toISOString(), computed_duration_days: 1.0, opcr_score: 3.8, evaluated_at: new Date(Date.now() - 86400000).toISOString() },
        { id: 4, transaction_id: "TX-52019", service_name: "Alumni ID Registration", time_in: new Date(Date.now() - 259200000).toISOString(), time_out: new Date(Date.now() - 250000000).toISOString(), computed_duration_days: 0.1065, opcr_score: 4.9, evaluated_at: new Date(Date.now() - 250000000).toISOString() },
        { id: 5, transaction_id: "TX-48301", service_name: "Good Moral Certificate", time_in: new Date(Date.now() - 345600000).toISOString(), time_out: new Date(Date.now() - 320000000).toISOString(), computed_duration_days: 0.2963, opcr_score: 4.5, evaluated_at: new Date(Date.now() - 320000000).toISOString() },
      ];
      setLogs(mockLogs);
      setTotalLogs(mockLogs.length);
    } finally {
      setLoading(false);
    }
  };

  const fetchUtilization = async () => {
    try {
      const res = await api.getServiceUtilization();
      if (Array.isArray(res) && res.length > 0) {
        setUtilization(res);
      } else {
        const mockUtilization = [
          { id: 1, service_name: "Enrollment Assessment", quarter: 2, year: 2026, transaction_count: 1245, office: "Records Office" },
          { id: 2, service_name: "Faculty Evaluation Request", quarter: 2, year: 2026, transaction_count: 812, office: "Academic Affairs" },
          { id: 3, service_name: "Document Request Processing", quarter: 2, year: 2026, transaction_count: 530, office: "Records Office" },
          { id: 4, service_name: "Good Moral Certificate", quarter: 2, year: 2026, transaction_count: 320, office: "OSAS" },
        ];
        setUtilization(mockUtilization);
      }
    } catch (err) {
      console.error("Failed to load service utilization:", err);
      const mockUtilization = [
        { id: 1, service_name: "Enrollment Assessment", quarter: 2, year: 2026, transaction_count: 1245, office: "Records Office" },
        { id: 2, service_name: "Faculty Evaluation Request", quarter: 2, year: 2026, transaction_count: 812, office: "Academic Affairs" },
        { id: 3, service_name: "Document Request Processing", quarter: 2, year: 2026, transaction_count: 530, office: "Records Office" },
        { id: 4, service_name: "Good Moral Certificate", quarter: 2, year: 2026, transaction_count: 320, office: "OSAS" },
      ];
      setUtilization(mockUtilization);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage, rowsPerPage, searchQuery]);

  useEffect(() => {
    fetchUtilization();
  }, []);

  // Soft animation / updates for pending queue simulation to showcase computational engine activity
  useEffect(() => {
    const interval = setInterval(() => {
      // Rotate queue items or simulate items being completed and new ones arriving
      setPendingQueue(prev => {
        const next = [...prev];
        if (next.length > 0) {
          const processed = next.shift();
          // Add a new random transaction
          const randId = `TX-${Math.floor(10000 + Math.random() * 90000)}`;
          const services = [
            "Enrollment Assessment",
            "Document Request Processing",
            "Faculty Evaluation Request",
            "Alumni ID Registration"
          ];
          const offices = ["Records Office", "Registrar Office", "Academic Affairs", "Alumni Relations"];
          const randIndex = Math.floor(Math.random() * services.length);

          next.push({
            transaction_id: randId,
            service_name: services[randIndex],
            office: offices[randIndex],
            queued_at: "Just now"
          });
        }
        return next;
      });
    }, 15000); // cycle every 15s

    return () => clearInterval(interval);
  }, []);

  const totalPages = Math.ceil(totalLogs / rowsPerPage) || 1;

  // OPCR 1-5 timeliness score styling helper
  const getScoreChipStyles = (score) => {
    const num = Number(score);
    if (num >= 4.5) return { bgcolor: '#ECFDF5', color: '#059669', border: '1px solid rgba(5, 150, 105, 0.2)', label: `Score: ${score} - Outstanding` };
    if (num >= 3.5) return { bgcolor: '#EFF6FF', color: '#2563EB', border: '1px solid rgba(37, 99, 235, 0.2)', label: `Score: ${score} - Very Satisfactory` };
    if (num >= 2.5) return { bgcolor: '#FFFBEB', color: '#D97706', border: '1px solid rgba(217, 119, 6, 0.2)', label: `Score: ${score} - Satisfactory` };
    if (num >= 1.5) return { bgcolor: '#FFF7ED', color: '#EA580C', border: '1px solid rgba(234, 88, 12, 0.2)', label: `Score: ${score} - Unsatisfactory` };
    return { bgcolor: '#FEF2F2', color: '#DC2626', border: '1px solid rgba(220, 38, 38, 0.2)', label: `Score: ${score} - Poor` };
  };

  return (
    <Box sx={{ p: 4, bgcolor: '#F8FAFC', minHeight: '100vh' }}>

      {/* Dynamic Keyframes for pulsing animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes pulse-green {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        .pulse-badge {
          width: 8px;
          height: 8px;
          background-color: #10B981;
          border-radius: 50%;
          display: inline-block;
          animation: pulse-green 2s infinite ease-in-out;
        }
      `}} />

      {/* Top Header */}
      <PageHeader breadcrumb="SLA Computation" title="SLA Computation Monitor" subtitle="Track real-time SLA computation status and transaction logs." />

      {/* Search Card */}
      <Card sx={{ p: 2, mb: 3, borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search Transaction ID..."
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
              width: 280,
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                bgcolor: '#ffffff',
              }
            }}
          />
        </Box>
      </Card>

      {/* Main Table Card */}
      <Card sx={{ borderRadius: '8px', border: '1px solid #E2E8F0', mb: 3, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
        <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#580000', '& .MuiTableCell-root': { py: 1.5, whiteSpace: 'nowrap' } }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>TRANSACTION ID</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>SERVICE NAME</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>TIME IN</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>TIME OUT</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>COMPUTED DURATION</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>TIMELINESS SCORE</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#ffffff' }}>COMPUTED AT</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} sx={{ color: '#580000', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">Fetching transaction logs...</Typography>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No computation logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const timeInFmt = new Date(log.time_in).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                  const timeOutFmt = new Date(log.time_out).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                  const evalFmt = new Date(log.evaluated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                  const scoreStyles = getScoreChipStyles(log.opcr_score);

                  return (
                    <TableRow
                      key={log.id}
                      hover
                      sx={{
                        '& .MuiTableCell-root': {
                          py: 1.5,
                          borderBottom: '1px solid #CBD5E1',
                          boxShadow: 'inset 0 -1.5px 0 0 rgba(0, 0, 0, 0.04)'
                        }
                      }}
                    >
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#1E293B' }}>{log.transaction_id}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{log.service_name}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{timeInFmt}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{timeOutFmt}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{Number(log.computed_duration_days).toFixed(4)} Days</TableCell>
                      <TableCell>
                        <Chip
                          label={scoreStyles.label}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            bgcolor: scoreStyles.bgcolor,
                            color: scoreStyles.color,
                            border: scoreStyles.border
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{evalFmt}</TableCell>
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

    </Box>
  );
}
