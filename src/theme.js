import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#800000', // Deep Maroon
      light: '#FFF5F5',
      dark: '#660000',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#D97706', // Golden Warning
      light: '#FFFBEB',
      dark: '#B45309',
      contrastText: '#ffffff',
    },
    success: {
      main: '#15803D',
      light: '#F0FDF4',
      dark: '#166534',
    },
    error: {
      main: '#EF4444',
      light: '#FEF2F2',
      dark: '#B91C1C',
    },
    info: {
      main: '#0284C7',
      light: '#F0F9FF',
      dark: '#0369A1',
    },
    background: {
      default: '#F8FAFC', // Slate background matching index.css
      paper: '#ffffff',
    },
    text: {
      primary: '#0F172A',
      secondary: '#475569',
      disabled: '#94A3B8',
    },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: [
      'Outfit',
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontFamily: 'Outfit, sans-serif',
      fontWeight: 600,
    },
    h2: {
      fontFamily: 'Outfit, sans-serif',
      fontWeight: 600,
    },
    h3: {
      fontFamily: 'Outfit, sans-serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily: 'Outfit, sans-serif',
      fontWeight: 600,
    },
    h5: {
      fontFamily: 'Outfit, sans-serif',
      fontWeight: 600,
    },
    h6: {
      fontFamily: 'Outfit, sans-serif',
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    subtitle2: {
      fontWeight: 500,
    },
    body1: {
      fontSize: '0.9375rem', // ~15px
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.8125rem', // ~13px
      lineHeight: 1.43,
    },
    button: {
      textTransform: 'none', // Premium non-uppercase buttons matching modern design
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          backgroundColor: '#800000',
          '&:hover': {
            backgroundColor: '#990000',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          padding: 8,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;
