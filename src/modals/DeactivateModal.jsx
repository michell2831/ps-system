import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

export default function DeactivateModal({ service, onConfirm, onCancel }) {
  const name = service?.name?.split("—")[0]?.trim() || "This service";

  return (
    <Dialog 
      open 
      onClose={(e, reason) => {
        if (reason !== "backdropClick") {
          onCancel(e, reason);
        }
      }} 
      sx={{ 
        '& .MuiDialog-paper': { 
          maxWidth: '500px', 
          width: '100%', 
          borderRadius: '16px', 
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #E2E8F0',
        } 
      }}
    >
      <DialogContent sx={{ p: '32px 32px 24px 32px' }}>
        {/* Top Info section */}
        <Box 
          sx={{ 
            width: 48, 
            height: 48, 
            borderRadius: '10px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            mb: '20px',
            bgcolor: '#FFFBEB',
            color: '#D97706',
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
          Deactivate Service?
        </Typography>

        {/* Warning Alert Box */}
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
          <Typography variant="body2" sx={{ fontSize: '12.5px', fontWeight: 500, color: '#B45309', lineHeight: 1.4 }}>
            This service will be hidden from transaction logging immediately.
          </Typography>
        </Box>

        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: '14px',
            lineHeight: 1.6, 
            color: '#475569',
          }}
        >
          <strong style={{ fontWeight: 600, color: '#0F172A' }}>{name}</strong> will be marked as <strong style={{ fontWeight: 600, color: '#0F172A' }}>Inactive</strong>. Existing transaction records will not be affected. This action can be reversed.
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
          Deactivate
        </Button>
      </DialogActions>
    </Dialog>
  );
}

