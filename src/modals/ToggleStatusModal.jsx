import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box
} from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

/**
 * ToggleStatusModal – Reusable activate / deactivate confirmation dialog.
 *
 * Props:
 *   open        – boolean
 *   isActivate  – true = "Activate" flow, false = "Deactivate" flow
 *   itemName    – name of the record being toggled (displayed in the body)
 *   entityLabel – label for the entity type, e.g. "KPI Target" (default: "item")
 *   bodyExtra   – optional extra sentence shown below the main confirmation
 *   onConfirm   – called when user confirms the toggle
 *   onCancel    – close / cancel handler
 */
export default function ToggleStatusModal({
  open,
  isActivate = true,
  itemName = '',
  entityLabel = 'item',
  bodyExtra,
  onConfirm,
  onCancel,
}) {
  const titleText = isActivate
    ? `Activate ${entityLabel}?`
    : `Deactivate ${entityLabel}?`;

  const themeColor = isActivate ? '#15803D' : '#DC2626';
  const hoverColor = isActivate ? '#166534' : '#B91C1C';
  const nameColor  = isActivate ? '#15803D' : '#0F172A';

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
            bgcolor: isActivate ? '#F0FDF4' : '#FFFBEB',
            color: isActivate ? '#15803D' : '#D97706',
          }}
        >
          {isActivate ? (
            <CheckCircleRoundedIcon sx={{ fontSize: 24 }} />
          ) : (
            <WarningAmberRoundedIcon sx={{ fontSize: 24 }} />
          )}
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
          {titleText}
        </Typography>

        {/* Warning Alert Box */}
        {bodyExtra && (
          <Box 
            sx={{
              border: isActivate ? '1px dashed rgba(21, 128, 61, 0.3)' : '1px dashed rgba(217, 119, 6, 0.3)',
              bgcolor: isActivate ? '#F0FDF4' : '#FFFDF9',
              borderRadius: '8px',
              p: '12px',
              mb: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5
            }}
          >
            {isActivate ? (
              <CheckCircleRoundedIcon sx={{ color: '#15803D', fontSize: 18, flexShrink: 0, mt: '2px' }} />
            ) : (
              <WarningAmberRoundedIcon sx={{ color: '#D97706', fontSize: 18, flexShrink: 0, mt: '2px' }} />
            )}
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '12.5px', 
                fontWeight: 500, 
                color: isActivate ? '#15803D' : '#B45309', 
                lineHeight: 1.4 
              }}
            >
              {bodyExtra}
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
          <strong style={{ fontWeight: 600, color: nameColor }}>"{itemName}"</strong> will be marked as <strong style={{ fontWeight: 600, color: '#0F172A' }}>{isActivate ? 'Active' : 'Inactive'}</strong>. Existing records will not be affected. This action can be reversed.
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
            bgcolor: themeColor,
            borderRadius: '8px',
            boxShadow: 'none',
            '&:hover': {
              bgcolor: hoverColor,
              boxShadow: 'none',
            }
          }}
        >
          {isActivate ? 'Activate' : 'Deactivate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
