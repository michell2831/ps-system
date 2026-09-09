import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Autorenew as AutorenewIcon,
  InfoOutlined as InfoIcon
} from '@mui/icons-material';
import { api } from '../services/api';

export default function RequestRevisionModal({
  open,
  commitment,
  periodName = 'Evaluation Period',
  onClose,
  onSuccess
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for the revision request.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.requestRevision(commitment.id, reason.trim());
      setReason('');
      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } catch (err) {
      console.error('Failed to request commitment revision:', err);
      setError(err.message || 'Failed to request revision. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason('');
      setError(null);
      onClose();
    }
  };

  const currentVersion = commitment?.version_number || 1;
  const nextVersion = currentVersion + 1;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '10px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden'
        }
      }}
    >
      <DialogContent sx={{ p: 3.5, pb: 2 }}>
        {/* Header with icon */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 2.5 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '8px',
              bgcolor: '#FEF3C7',
              border: '1px solid #FDE68A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706',
              flexShrink: 0
            }}
          >
            <AutorenewIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: '1.25rem',
                color: '#1E293B',
                lineHeight: 1.3
              }}
            >
              Request Commitment Revision
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
              {periodName} · Version {currentVersion} (Locked)
            </Typography>
          </Box>
        </Box>

        {/* Informational Guidance Alert */}
        <Alert
          severity="info"
          icon={<InfoIcon fontSize="inherit" />}
          sx={{
            mb: 3,
            borderRadius: '6px',
            bgcolor: '#EFF6FF',
            color: '#1E40AF',
            border: '1px solid #DBEAFE',
            fontSize: '0.8125rem',
            '& .MuiAlert-icon': { color: '#2563EB' }
          }}
        >
          Requesting a revision will preserve this <strong>V{currentVersion} (Locked)</strong> commitment in version history and create a new <strong>V{nextVersion} (Draft)</strong> version with all existing items copied for editing.
        </Alert>

        {/* Reason Text Area */}
        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 1 }}>
          <Typography
            component="label"
            htmlFor="revision-reason-input"
            sx={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              mb: 1
            }}
          >
            Reason for Revision <span style={{ color: '#EF4444' }}>*</span>
          </Typography>
          <TextField
            id="revision-reason-input"
            multiline
            rows={4}
            fullWidth
            placeholder="Explain why this commitment needs to be revised (e.g., modified service standards, budget reallocation, updated targets)..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            disabled={loading}
            error={Boolean(error)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '6px',
                fontSize: '0.875rem',
                bgcolor: '#FFFFFF',
                '& fieldset': { borderColor: '#CBD5E1' },
                '&:hover fieldset': { borderColor: '#94A3B8' },
                '&.Mui-focused fieldset': { borderColor: '#580000', borderWidth: '1.5px' }
              }
            }}
          />
        </Box>

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: '6px', fontSize: '0.825rem' }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3.5, pb: 3.5, pt: 1, gap: 1.5 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
          sx={{
            borderColor: '#CBD5E1',
            color: '#475569',
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: '6px',
            px: 2.5,
            '&:hover': {
              borderColor: '#94A3B8',
              bgcolor: '#F8FAFC'
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !reason.trim()}
          variant="contained"
          sx={{
            bgcolor: '#580000',
            color: '#FFFFFF',
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: '6px',
            px: 3,
            '&:hover': {
              bgcolor: '#700000'
            },
            '&.Mui-disabled': {
              bgcolor: '#E2E8F0',
              color: '#94A3B8'
            }
          }}
        >
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} color="inherit" />
              <span>Submitting...</span>
            </Box>
          ) : (
            'Submit Revision Request'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
