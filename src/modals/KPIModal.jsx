import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  MenuItem,
  Box,
  InputAdornment
} from '@mui/material';

const getArtaClassification = (svc) => {
  if (!svc) return "Simple";
  let days = 0;
  if (svc.sla_target_unit === 'Days') {
    days = svc.sla_target_value;
  } else if (svc.sla_target_unit === 'Minutes') {
    days = svc.sla_target_value / 1440;
  } else if (svc.sla_target_unit === 'Hours') {
    days = svc.sla_target_value / 24;
  }
  if (days > 7) return "Highly Technical";
  if (days > 3) return "Complex";
  return "Simple";
};

/**
 * KPIModal – Add / Edit KPI Standard Target dialog.
 *
 * Props:
 *   open           – boolean (showAdd || !!editingKpi)
 *   editingKpi     – kpi object when editing, null when adding
 *   services       – array of available services for the linked-service select
 *
 *   // form field state (all lifted to parent)
 *   name / setName
 *   category / setCategory
 *   target / setTarget
 *   targetDays / setTargetDays
 *   targetHours / setTargetHours
 *   targetMins / setTargetMins
 *   unit / setUnit
 *   serviceId / setServiceId
 *   errors / setErrors
 *
 *   onSave  – form submit handler (receives event)
 *   onClose – cancel handler
 */
export default function KPIModal({
  open,
  editingKpi,
  services,
  name, setName,
  category, setCategory,
  target, setTarget,
  targetDays, setTargetDays,
  targetHours, setTargetHours,
  targetMins, setTargetMins,
  unit, setUnit,
  serviceId, setServiceId,
  errors, setErrors,
  onSave,
  onClose,
}) {
  return (
    <Dialog
      open={open}
      onClose={(e, reason) => {
        if (reason !== "backdropClick") {
          onClose(e, reason);
        }
      }}
      sx={{ '& .MuiDialog-paper': { maxWidth: '480px', width: '100%', borderRadius: 2.5 } }}
    >
      <DialogTitle sx={{ fontWeight: 500, fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.35rem', pb: 1 }}>
        {editingKpi ? 'Edit KPI Standard Target' : 'Define KPI Standard Target'}
      </DialogTitle>

      <form onSubmit={onSave} noValidate>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          {/* KPI Name */}
          <TextField
            label="KPI Target Name"
            placeholder="e.g. Processing time for Graduation Clearance"
            required
            fullWidth
            value={name}
            error={!!errors.name}
            helperText={errors.name || ''}
            onChange={(e) => {
              setName(e.target.value);
              setErrors(prev => ({ ...prev, name: '' }));
            }}
            inputProps={{ maxLength: 150 }}
            variant="outlined"
            size="small"
            sx={{ '& .MuiFormLabel-asterisk': { color: '#ef4444' } }}
          />

          {/* Category Select */}
          <TextField
            select
            label="Measurement Category"
            required
            fullWidth
            value={category}
            onChange={(e) => {
              const newCat = e.target.value;
              setCategory(newCat);
              setErrors({});
              if (newCat === 'Quality') {
                setUnit('%');
              } else {
                if (unit === '%') setUnit(' Days');
              }
            }}
            size="small"
            sx={{ '& .MuiFormLabel-asterisk': { color: '#ef4444' } }}
          >
            <MenuItem value="Timeliness">Timeliness (SLA / Processing Duration)</MenuItem>
            <MenuItem value="Quality">Quality Graded standard (Satisfaction)</MenuItem>
            <MenuItem value="Efficiency">Efficiency (Completion Volume Rate)</MenuItem>
          </TextField>

          {/* Target Values */}
          {/* Target Values */}
          {(category === 'Quality' || unit === '/ 5') ? (
            <TextField
              label="Target Value"
              placeholder={unit === '/ 5' ? "e.g. 5" : "e.g. 95"}
              type="number"
              inputProps={unit === '/ 5' ? { step: '1', min: 1, max: 5 } : { step: 'any', min: 0, max: 100 }}
              required
              fullWidth
              value={target}
              error={!!errors.target}
              helperText={errors.target || ''}
              onChange={(e) => {
                setTarget(e.target.value);
                setErrors(prev => ({ ...prev, target: '' }));
              }}
              size="small"
              sx={{ '& .MuiFormLabel-asterisk': { color: '#ef4444' } }}
              slotProps={{
                input: {
                  endAdornment: category === 'Quality' ? (
                    <InputAdornment position="end">%</InputAdornment>
                  ) : null
                }
              }}
            />
          ) : (
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}>
                TARGET VALUE <span style={{ color: '#ef4444' }}>*</span>
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, mb: 2 }}>
                <TextField
                  label="Days"
                  placeholder="Days"
                  type="number"
                  inputProps={{ min: 0 }}
                  value={targetDays}
                  error={!!errors.target}
                  onChange={(e) => {
                    setTargetDays(e.target.value);
                    setErrors(prev => ({ ...prev, target: '' }));
                  }}
                  size="small"
                />
                <TextField
                  label="Hours"
                  placeholder="Hours"
                  type="number"
                  inputProps={{ min: 0, max: 23 }}
                  value={targetHours}
                  error={!!errors.target}
                  onChange={(e) => {
                    setTargetHours(e.target.value);
                    setErrors(prev => ({ ...prev, target: '' }));
                  }}
                  size="small"
                />
                <TextField
                  label="Mins"
                  placeholder="Mins"
                  type="number"
                  inputProps={{ min: 0, max: 59 }}
                  value={targetMins}
                  error={!!errors.target}
                  onChange={(e) => {
                    setTargetMins(e.target.value);
                    setErrors(prev => ({ ...prev, target: '' }));
                  }}
                  size="small"
                />
              </Box>
              {errors.target && (
                <Typography variant="caption" color="error" sx={{ mt: 1, mb: 2, display: 'block', fontWeight: 500 }}>
                  {errors.target}
                </Typography>
              )}
            </Box>
          )}

          {/* Linked Service */}
          <TextField
            select
            label="Link to Service Charter"
            required
            fullWidth
            value={serviceId}
            error={!!errors.serviceId}
            helperText={errors.serviceId || ''}
            onChange={(e) => {
              setServiceId(e.target.value);
              setErrors(prev => ({ ...prev, serviceId: '' }));
            }}
            size="small"
            sx={{ '& .MuiFormLabel-asterisk': { color: '#ef4444' } }}
          >
            <MenuItem value="">Select Service...</MenuItem>
            {services.filter(s => s.active || String(s.id) === String(serviceId)).map(s => {
              const artaClass = getArtaClassification(s);
              const customClass = s.classification;
              const hasCustom = customClass && customClass.trim() !== "" && customClass.toLowerCase() !== artaClass.toLowerCase();
              const classLabel = hasCustom ? `(${customClass})` : "";
              return (
                <MenuItem key={s.id} value={s.id}>
                  {s.name} {classLabel}
                </MenuItem>
              );
            })}
          </TextField>


        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
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
            {editingKpi ? 'Save Changes' : 'Define KPI'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
