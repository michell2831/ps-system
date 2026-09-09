import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Paper,
  Button,
  TextField,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import { Edit as EditIcon, Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';
import { useState } from 'react';

const TYPE_CONFIG = {
  National: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  Local:    { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  Campus:   { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
};

const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec'
];

/**
 * HolidayRegistryModal – shows all holidays in a searchable / filterable list.
 *
 * Props:
 *   open            – boolean
 *   onClose         – close handler
 *   registryGroups  – grouped holiday array (from HolidayCalendar)
 *   totalCount      – total raw holiday count
 *   onEdit          – (holidayRecord) => void  called when pencil icon is clicked
 */
export default function HolidayRegistryModal({ open, onClose, registryGroups = [], totalCount = 0, onEdit }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  const filtered = registryGroups.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchType   = !typeFilter || g.type === typeFilter;
    const matchMonth  = monthFilter === '' || g.dateObject.getMonth() === parseInt(monthFilter);
    return matchSearch && matchType && matchMonth;
  });

  return (
    <Dialog
      open={open}
      onClose={(e, reason) => {
        if (reason !== "backdropClick") {
          onClose(e, reason);
        }
      }}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
    >
      {/* ── Header ── */}
      <DialogTitle sx={{ fontWeight: 500, fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.35rem', pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            Holiday Registry
            <Typography
              component="span"
              sx={{ ml: 1.5, fontSize: 11, fontWeight: 700, color: 'text.disabled',
                    textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              {totalCount} Holiday{totalCount !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* ── Filters ── */}
      <Box sx={{ px: 3, pb: 1.5, display: 'flex', gap: 1.5 }}>
        <TextField
          size="small"
          placeholder="Search holiday…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 1 }}
        />
        <TextField
          select
          size="small"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          sx={{ width: 140 }}
        >
          <MenuItem value="">All Types</MenuItem>
          <MenuItem value="National">National</MenuItem>
          <MenuItem value="Local">Local</MenuItem>
          <MenuItem value="Campus">Campus</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          sx={{ width: 140 }}
        >
          <MenuItem value="">All Months</MenuItem>
          {MONTHS.map((m, idx) => (
            <MenuItem key={m} value={idx}>{m}</MenuItem>
          ))}
        </TextField>
      </Box>

      {/* ── List ── */}
      <DialogContent sx={{ pt: 0, px: 3 }}>
        {filtered.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No holidays found.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filtered.map(g => {
              const d = g.dateObject;
              const cfg = TYPE_CONFIG[g.type] || {};
              return (
                <Paper
                  key={g.id}
                  variant="outlined"
                  sx={{
                    p: 1.5, borderRadius: 2,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    border: '1px solid #E2E8F0',
                    '&:hover': { bgcolor: '#F8FAFC' },
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Date badge + info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                      width: 44, height: 44,
                      bgcolor: cfg.color || '#888',
                      color: '#fff',
                      borderRadius: 2,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 800, lineHeight: 1.1 }}>
                        {d.getDate()}
                      </Typography>
                      <Typography sx={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', lineHeight: 1 }}>
                        {MONTHS[d.getMonth()]}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {g.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                        {g.type}{g.is_recurring ? ' · Recurring' : ''} · {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][d.getMonth()]} {d.getDate()}, {g.yearLabel}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Edit button */}
                  <IconButton
                    size="small"
                    onClick={() => { onClose(); onEdit(g.records[0]); }}
                    sx={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 1.5,
                      '&:hover': { bgcolor: '#F1F5F9' },
                      flexShrink: 0,
                    }}
                  >
                    <EditIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                  </IconButton>
                </Paper>
              );
            })}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button variant="outlined" color="inherit" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
