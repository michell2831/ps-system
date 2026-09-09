import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

/**
2. * ArchiveConfirmModal – Confirmation dialog specifically for archiving a service,
 * showing a downstream impact warning banner if the service has active KPIs or draft commitments.
 *
 * Props:
 *   open                 – boolean
 *   itemName             – name of the service
 *   hasDownstreamImpact  – boolean (true if has active KPIs or draft commitments)
 *   onConfirm            – callback when confirmed
 *   onCancel             – callback when cancelled
 */
export default function ArchiveConfirmModal({
  open,
  itemName = '',
  hasDownstreamImpact = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog 
      open={open} 
      onClose={(e, reason) => {
        if (reason !== "backdropClick") {
          onCancel(e, reason);
        }
      }} 
      sx={{ 
        '& .MuiDialog-paper': { 
          maxWidth: '480px', 
          width: '100%', 
          borderRadius: '16px', 
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #E2E8F0',
        } 
      }}
    >
      <DialogContent sx={{ p: '32px 32px 24px 32px' }}>
        {/* Top Warning Icon section */}
        <Box 
          sx={{ 
            width: 48, 
            height: 48, 
            borderRadius: '10px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            mb: '20px',
            bgcolor: '#FEF2F2',
            color: '#DC2626',
            border: '1px solid rgba(220, 38, 38, 0.15)',
          }}
        >
          <WarningAmberRoundedIcon sx={{ fontSize: 24 }} />
        </Box>
        
        <Typography 
          variant="h6" 
          component="h3" 
          sx={{ 
            fontWeight: 500, 
            color: '#0F172A', 
            mb: '14px',
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: '1.35rem',
            letterSpacing: '-0.01em',
          }}
        >
          Archive Service?
        </Typography>

        {/* Warning Alert Box for Downstream Impact */}
        {hasDownstreamImpact && (
          <Box 
            sx={{
              border: '1px dashed rgba(217, 119, 6, 0.3)',
              bgcolor: '#FFFDF9',
              borderRadius: '8px',
              p: '12px',
              mb: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5
            }}
          >
            <WarningAmberRoundedIcon sx={{ color: '#D97706', fontSize: 18, flexShrink: 0, mt: '2px' }} />
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '12.5px', 
                fontWeight: 500, 
                color: '#B45309', 
                lineHeight: 1.4 
              }}
            >
              This service has active KPIs or is part of a draft OPCR commitment. Archiving it will remove it from those records.
            </Typography>
          </Box>
        )}

        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: '14px',
            lineHeight: 1.6, 
            color: '#475569',
          }}
        >
          Are you sure you want to archive <strong style={{ fontWeight: 600, color: '#0F172A' }}>"{itemName}"</strong>? Archiving will make this service read-only, hide it from the active catalog list, and mark its status as Archived. This action cannot be undone.
        </Typography>
      </DialogContent>

      {/* Bottom Actions section */}
      <DialogActions 
        sx={{ 
          bgcolor: '#F8FAFC', 
          p: '16px 32px', 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '12px', 
          borderTop: '1px solid #F1F5F9',
        }}
      >
        <Button 
          variant="outlined" 
          color="inherit"
          onClick={onCancel}
          sx={{ 
            textTransform: 'none', 
            px: '18px', 
            py: '9px', 
            fontSize: '13.5px', 
            fontWeight: 600, 
            color: '#334155', 
            bgcolor: '#ffffff',
            borderColor: '#CBD5E1', 
            borderRadius: '8px',
            '&:hover': {
              bgcolor: '#F8FAFC',
              borderColor: '#94A3B8',
              color: '#0F172A',
            }
          }}
        >
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={onConfirm}
          sx={{ 
            textTransform: 'none', 
            px: '18px', 
            py: '9px', 
            fontSize: '13.5px', 
            fontWeight: 600, 
            color: '#ffffff', 
            bgcolor: '#DC2626',
            borderRadius: '8px',
            boxShadow: 'none',
            '&:hover': {
              bgcolor: '#B91C1C',
              boxShadow: 'none',
            }
          }}
        >
          Archive Service
        </Button>
      </DialogActions>
    </Dialog>
  );
}
