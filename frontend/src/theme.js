import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Custom breakpoints
const breakpoints = {
  values: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
  },
};

// Common palette values
const commonPalette = {
  success: {
    main: '#2e7d32',
    light: '#4caf50',
    dark: '#1b5e20',
  },
  info: {
    main: '#0288d1',
    light: '#03a9f4',
    dark: '#01579b',
  },
  warning: {
    main: '#ed6c02',
    light: '#ff9800',
    dark: '#e65100',
  },
  error: {
    main: '#d32f2f',
    light: '#ef5350',
    dark: '#c62828',
  },
};

// Common theme settings
const commonSettings = {
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
};

// Create base shadows array with 25 levels (0-24)
const createShadows = (mode) => {
  const umbra = mode === 'dark' ? '0, 0, 0' : '66, 66, 66';
  const penumbra = mode === 'dark' ? '0, 0, 0' : '77, 77, 77';
  const ambient = mode === 'dark' ? '0, 0, 0' : '88, 88, 88';

  return [
    'none',
    `0px 2px 1px -1px rgba(${umbra}, 0.2),0px 1px 1px 0px rgba(${penumbra}, 0.14),0px 1px 3px 0px rgba(${ambient}, 0.12)`,
    `0px 3px 1px -2px rgba(${umbra}, 0.2),0px 2px 2px 0px rgba(${penumbra}, 0.14),0px 1px 5px 0px rgba(${ambient}, 0.12)`,
    `0px 3px 3px -2px rgba(${umbra}, 0.2),0px 3px 4px 0px rgba(${penumbra}, 0.14),0px 1px 8px 0px rgba(${ambient}, 0.12)`,
    `0px 2px 4px -1px rgba(${umbra}, 0.2),0px 4px 5px 0px rgba(${penumbra}, 0.14),0px 1px 10px 0px rgba(${ambient}, 0.12)`,
    `0px 3px 5px -1px rgba(${umbra}, 0.2),0px 5px 8px 0px rgba(${penumbra}, 0.14),0px 1px 14px 0px rgba(${ambient}, 0.12)`,
    `0px 3px 5px -1px rgba(${umbra}, 0.2),0px 6px 10px 0px rgba(${penumbra}, 0.14),0px 1px 18px 0px rgba(${ambient}, 0.12)`,
    `0px 4px 5px -2px rgba(${umbra}, 0.2),0px 7px 10px 1px rgba(${penumbra}, 0.14),0px 2px 16px 1px rgba(${ambient}, 0.12)`,
    `0px 5px 5px -3px rgba(${umbra}, 0.2),0px 8px 10px 1px rgba(${penumbra}, 0.14),0px 3px 14px 2px rgba(${ambient}, 0.12)`,
    `0px 5px 6px -3px rgba(${umbra}, 0.2),0px 9px 12px 1px rgba(${penumbra}, 0.14),0px 3px 16px 2px rgba(${ambient}, 0.12)`,
    `0px 6px 6px -3px rgba(${umbra}, 0.2),0px 10px 14px 1px rgba(${penumbra}, 0.14),0px 4px 18px 3px rgba(${ambient}, 0.12)`,
    `0px 6px 7px -4px rgba(${umbra}, 0.2),0px 11px 15px 1px rgba(${penumbra}, 0.14),0px 4px 20px 3px rgba(${ambient}, 0.12)`,
    `0px 7px 8px -4px rgba(${umbra}, 0.2),0px 12px 17px 2px rgba(${penumbra}, 0.14),0px 5px 22px 4px rgba(${ambient}, 0.12)`,
    `0px 7px 8px -4px rgba(${umbra}, 0.2),0px 13px 19px 2px rgba(${penumbra}, 0.14),0px 5px 24px 4px rgba(${ambient}, 0.12)`,
    `0px 7px 9px -4px rgba(${umbra}, 0.2),0px 14px 21px 2px rgba(${penumbra}, 0.14),0px 5px 26px 4px rgba(${ambient}, 0.12)`,
    `0px 8px 9px -5px rgba(${umbra}, 0.2),0px 15px 22px 2px rgba(${penumbra}, 0.14),0px 6px 28px 5px rgba(${ambient}, 0.12)`,
    `0px 8px 10px -5px rgba(${umbra}, 0.2),0px 16px 24px 2px rgba(${penumbra}, 0.14),0px 6px 30px 5px rgba(${ambient}, 0.12)`,
    `0px 8px 11px -5px rgba(${umbra}, 0.2),0px 17px 26px 2px rgba(${penumbra}, 0.14),0px 6px 32px 5px rgba(${ambient}, 0.12)`,
    `0px 9px 11px -5px rgba(${umbra}, 0.2),0px 18px 28px 2px rgba(${penumbra}, 0.14),0px 7px 34px 6px rgba(${ambient}, 0.12)`,
    `0px 9px 12px -6px rgba(${umbra}, 0.2),0px 19px 29px 2px rgba(${penumbra}, 0.14),0px 7px 36px 6px rgba(${ambient}, 0.12)`,
    `0px 10px 13px -6px rgba(${umbra}, 0.2),0px 20px 31px 3px rgba(${penumbra}, 0.14),0px 8px 38px 7px rgba(${ambient}, 0.12)`,
    `0px 10px 13px -6px rgba(${umbra}, 0.2),0px 21px 33px 3px rgba(${penumbra}, 0.14),0px 8px 40px 7px rgba(${ambient}, 0.12)`,
    `0px 10px 14px -6px rgba(${umbra}, 0.2),0px 22px 35px 3px rgba(${penumbra}, 0.14),0px 8px 42px 7px rgba(${ambient}, 0.12)`,
    `0px 11px 14px -7px rgba(${umbra}, 0.2),0px 23px 36px 3px rgba(${penumbra}, 0.14),0px 9px 44px 8px rgba(${ambient}, 0.12)`,
    `0px 11px 15px -7px rgba(${umbra}, 0.2),0px 24px 38px 3px rgba(${penumbra}, 0.14),0px 9px 46px 8px rgba(${ambient}, 0.12)`,
  ];
};

// Light theme base configuration
const baseLightTheme = createTheme({
  ...commonSettings,
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
    },
    error: {
      main: '#d32f2f',
      light: '#ef5350',
      dark: '#c62828',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
    },
    info: {
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#01579b',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  shadows: createShadows('light'),
});

// Dark theme base configuration
const baseDarkTheme = createTheme({
  ...commonSettings,
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
      light: '#e3f2fd',
      dark: '#42a5f5',
    },
    secondary: {
      main: '#ce93d8',
      light: '#f3e5f5',
      dark: '#ab47bc',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    warning: {
      main: '#ffa726',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    info: {
      main: '#29b6f6',
      light: '#4fc3f7',
      dark: '#0288d1',
    },
    success: {
      main: '#66bb6a',
      light: '#81c784',
      dark: '#388e3c',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  shadows: createShadows('dark'),
});

// Apply responsive typography to both themes
const responsiveLight = responsiveFontSizes(baseLightTheme);
const responsiveDark = responsiveFontSizes(baseDarkTheme);

// Export both themes with named exports for backward compatibility
export const lightTheme = responsiveLight;
export const darkTheme = responsiveDark;

// Also export light theme as default for new imports
export default responsiveLight;