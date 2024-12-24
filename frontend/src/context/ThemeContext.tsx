import React, { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material';

const ThemeContext = createContext({
  isDarkMode: false,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? 'dark' : 'light',
          primary: {
            main: '#1A237E',
            light: '#303F9F',
            dark: '#0D1342',
            contrastText: '#ffffff',
          },
          background: {
            default: isDarkMode ? '#121212' : '#F5F7FA',
            paper: isDarkMode ? '#1E1E1E' : '#ffffff',
          },
          text: {
            primary: isDarkMode ? '#ffffff' : '#2C3E50',
            secondary: isDarkMode ? '#B0B0B0' : '#546E7A',
          },
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: '#2b2a29',
              },
            },
          },
          MuiTableContainer: {
            styleOverrides: {
              root: {
                '& .MuiTableCell-root': {
                  borderRight: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'}`,
                  '&:last-child': {
                    borderRight: 'none'
                  }
                },
              },
            },
          },
          MuiTableHead: {
            styleOverrides: {
              root: {
                '& .MuiTableCell-root': {
                  backgroundColor: isDarkMode ? '#2b2a29' : '#f5f5f5',
                  color: isDarkMode ? '#ffffff' : '#2C3E50',
                  fontWeight: 'bold',
                  borderBottom: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'}`,
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                },
              },
            },
          },
          MuiTableRow: {
            styleOverrides: {
              root: {
                '&:nth-of-type(odd)': {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                },
                '&:hover': {
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
                },
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: {
                borderBottom: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'}`,
                color: isDarkMode ? '#ffffff' : 'inherit',
                '&[align="right"]': {
                  '& .unit': {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
                    marginLeft: '4px',
                    fontSize: '0.8rem',
                  },
                },
                '& .MuiButton-root': {
                  color: isDarkMode ? '#90CAF9' : '#1A237E',
                },
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                transition: 'background-color 0.3s ease-in-out',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              contained: {
                backgroundColor: '#1A237E',
                '&:hover': {
                  backgroundColor: '#303F9F',
                },
              },
              outlined: {
                color: isDarkMode ? '#90CAF9' : '#1A237E',
                borderColor: isDarkMode ? '#90CAF9' : '#1A237E',
                '&:hover': {
                  borderColor: isDarkMode ? '#64B5F6' : '#303F9F',
                  backgroundColor: isDarkMode ? 'rgba(144, 202, 249, 0.08)' : 'rgba(26, 35, 126, 0.04)',
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                color: isDarkMode ? '#ffffff' : 'inherit',
              },
              colorPrimary: {
                backgroundColor: isDarkMode ? '#1A237E' : '#1A237E',
                color: '#ffffff',
              },
            },
          },
          MuiTypography: {
            styleOverrides: {
              root: {
                '&.MuiTypography-h6': {
                  color: isDarkMode ? '#ffffff' : '#2b2a29',
                },
                '&.MuiTypography-h4': {
                  color: isDarkMode ? '#ffffff' : '#2b2a29',
                },
                '&.MuiTypography-subtitle1': {
                  color: isDarkMode ? '#ffffff' : 'inherit',
                },
                '&.MuiTypography-caption': {
                  color: isDarkMode ? '#B0B0B0' : 'inherit',
                },
              },
            },
          },
        },
      }),
    [isDarkMode]
  );

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext); 