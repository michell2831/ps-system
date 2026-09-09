import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material';

/**
 * DeleteConfirmModal – Generic delete confirmation dialog.
 *
 * Props:
 *   open       – boolean
 *   itemName   – display name of the item being deleted
 *   onConfirm  – called when user confirms delete
 *   onCancel   – called when user cancels
 *   title      – optional custom title (default: "Delete this item?")
 *   description – optional override for body text
 */
export default function DeleteConfirmModal({
  open,
  itemName,
  onConfirm,
  onCancel,
  title = 'Delete this item?',
  description,
}) {
  return (
    <Dialog
      open={open}
      onClose={(e, reason) => {
        if (reason !== "backdropClick") {
          onCancel(e, reason);
        }
      }}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
    >
      <DialogTitle sx={{ fontWeight: 500, fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.35rem', pb: 1 }}>
        {title}
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {description ?? (
            <>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>{itemName}</span> will be
              permanently removed. This action cannot be undone.
            </>
          )}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
        <Button variant="outlined" color="inherit" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="contained" color="error" onClick={onConfirm}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
