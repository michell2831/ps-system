import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Box,
  Alert
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

/**
 * HolidayModal – Add / Edit holiday dialog.
 *
 * Props:
 *   open           – boolean
 *   editingHoliday – holiday object when editing, null when adding
 *   name / setName
 *   date / setDate
 *   type / setType
 *   isRecurring / setIsRecurring
 *   warning        – warning message to show in amber banner
 *   onSave         – form submit handler (receives event)
 *   onClose        – close / cancel handler
 *   onDelete       – called when "Delete" is clicked; passes editingHoliday
 */
export default function HolidayModal({
  open,
  editingHoliday,
  name, setName,
  date, setDate,
  type, setType,
  isRecurring, setIsRecurring,
  warning,
  errors = {},
  setErrors,
  onSave,
  onClose,
  onDelete,
}) {
  return (
    <Dialog
      open={open}
      onClose={(e, reason) => {
        if (reason !== "backdropClick") {
          onClose(e, reason);
        }
      }}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
    >
      <DialogTitle sx={{ fontWeight: 500, fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.35rem', pb: 1 }}>
        {editingHoliday ? 'Edit Holiday' : 'Encode Holiday'}
      </DialogTitle>

      <form onSubmit={onSave} noValidate>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
          {warning && (
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 1, 
                bgcolor: "#FFFBEB", 
                color: "#D97706", 
                border: "1px solid rgba(217,119,6,0.15)", 
                "& .MuiAlert-icon": { color: "#D97706" } 
              }}
            >
              {warning}
            </Alert>
          )}

          <TextField
            label="Holiday Name"
            placeholder="e.g. Independence Day"
            fullWidth
            size="small"
            value={name}
            error={!!errors?.name}
            helperText={errors?.name || ''}
            onChange={e => { setName(e.target.value); if (setErrors) setErrors(prev => ({ ...prev, name: '' })); }}
            sx={{ mt: 1, '& .MuiFormLabel-asterisk': { color: '#ef4444' } }}
          />

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
              DATE <span style={{ color: '#ef4444' }}>*</span>
            </Typography>
            <TextField
              type="date"
              fullWidth
              size="small"
              value={date}
              error={!!errors?.date}
              helperText={errors?.date || ''}
              onChange={e => { setDate(e.target.value); if (setErrors) setErrors(prev => ({ ...prev, date: '' })); }}
            />
          </Box>

          <TextField
            select
            label="Holiday Type"
            fullWidth
            size="small"
            value={type}
            error={!!errors?.type}
            helperText={errors?.type || ''}
            onChange={e => { setType(e.target.value); if (setErrors) setErrors(prev => ({ ...prev, type: '' })); }}
            sx={{ '& .MuiFormLabel-asterisk': { color: '#ef4444' } }}
          >
            <MenuItem value="National">National Holiday</MenuItem>
            <MenuItem value="Local">Local Holiday</MenuItem>
            <MenuItem value="Campus">Campus / Office Holiday</MenuItem>
          </TextField>

          <FormControlLabel
            sx={{ alignItems: 'flex-start', mt: 1 }}
            control={
              <Checkbox
                checked={isRecurring}
                onChange={e => setIsRecurring(e.target.checked)}
                color="primary"
                sx={{ p: 0.5, mr: 1, '& .MuiSvgIcon-root': { fontSize: 26 } }}
              />
            }
            label={
              <Box sx={{ display: 'flex', flexDirection: 'column', mt: 0.5 }}>
                <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', lineHeight: 1.2 }}>
                  Recurring Annual Holiday
                </Typography>
                <Typography sx={{ fontSize: '12.5px', color: '#64748B', fontWeight: 500, mt: 0.5 }}>
                  Auto-encodes for next 5 years
                </Typography>
              </Box>
            }
          />


        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
          {editingHoliday && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => onDelete(editingHoliday)}
              sx={{ mr: 'auto' }}
            >
              Delete
            </Button>
          )}
          <Button variant="outlined" color="inherit" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            sx={{
              bgcolor: '#15803D',
              '&:hover': { bgcolor: '#166534' }
            }}
          >
            {editingHoliday ? 'Save Changes' : 'Encode Holiday'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
