import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert
} from '@mui/material';
import {
  WarningAmberRounded as WarningAmberRoundedIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

/**
 * ConfirmModal – Generic "are you sure?" confirmation dialog with an
 * informational alert block underneath the body copy.
 *
 * Props:
 *   open        – boolean
 *   title       – main heading text
 *   subtitle    – small caption under the heading
 *   body        – ReactNode / string for the description paragraph
 *   alertText   – ReactNode / string shown in the green info Alert
 *   onConfirm   – called when "Yes, Publish" / confirmLabel is clicked
 *   onCancel    – close / cancel handler
 *   confirmLabel – button label (default: "Confirm")
 *   cancelLabel  – button label (default: "Cancel")
 */
export default function ConfirmModal({
  open,
  title = 'Confirm Action',
  subtitle = '',
  body,
  alertText,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}) {
  return (
    <Dialog
      open={open}
      onClose={(e, reason) => {
        if (reason !== "backdropClick") {
          onCancel(e, reason);
        }
      }}
      maxWidth="xs"
      fullWidth
    >
      <DialogContent sx={{ pt: 3 }}>
        {/* Icon + heading row */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: '#FFF7ED',
              border: '1px solid #FFEDD5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EA580C',
              flexShrink: 0,
            }}
          >
            <WarningAmberRoundedIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 500, fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.35rem', color: 'text.primary' }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 500 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Body text */}
        {body && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
            {body}
          </Typography>
        )}

        {/* Optional info alert */}
        {alertText && (
          <Alert
            severity="success"
            variant="outlined"
            icon={<CheckCircleIcon />}
            sx={{ bgcolor: '#F0FDF4', color: '#166534', borderColor: '#BBF7D0', mb: 1 }}
          >
            {alertText}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
        <Button variant="outlined" color="inherit" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          sx={{
            bgcolor: '#15803D',
            '&:hover': { bgcolor: '#166534' }
          }}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
