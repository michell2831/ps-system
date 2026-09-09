import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
} from "@mui/material";

export default function NaFlagModal({ service, activePeriod, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    await onConfirm(service.id, activePeriod.id, reason);
    setSubmitting(false);
  };

  if (!service || !activePeriod) return null;

  return (
    <Dialog
      open={true}
      onClose={(e, reason) => {
        if (reason !== "backdropClick") {
          onClose(e, reason);
        }
      }}
      maxWidth="sm"
      fullWidth
      sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 500, fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.35rem', pb: 1 }}>
        Flag Service as N/A
      </DialogTitle>
      <DialogContent sx={{ p: 2, pt: 3 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          You are flagging <strong>{service.name}</strong> as Not Applicable for the <strong>{activePeriod.name}</strong> evaluation period.
          This will prevent it from appearing in the Commitment wizard.
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
            REASON FOR N/A <span style={{ color: '#ef4444' }}>*</span>
          </Typography>
          <TextField
            fullWidth
            required
            multiline
            rows={3}
            placeholder="e.g. Service is temporarily suspended due to..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting}
          sx={{ bgcolor: '#D97706', '&:hover': { bgcolor: '#B45309' }, fontWeight: 600 }}
        >
          {submitting ? "Flagging..." : "Confirm N/A Flag"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
