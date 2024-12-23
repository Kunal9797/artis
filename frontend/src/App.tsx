import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { CssBaseline, ThemeProvider, createTheme, Box } from '@mui/material';
import ProductCatalog from './components/ProductCatalog';
import DesignPaperOrder from './components/DesignPaperOrder';
import OrdersPage from './components/OrdersPage';
import InventoryList from './components/Inventory/InventoryList';
import ProtectedRoute from './components/ProtectedRoute';

const theme = createTheme({
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    h5: {
      fontWeight: 600,
      letterSpacing: '-0.5px',
    },
    h6: {
      fontWeight: 500,
      letterSpacing: '-0.3px',
    },
  },
  palette: {
    primary: {
      main: '#1A237E',
      light: '#303F9F',
      dark: '#0D1342',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#26A69A',
      light: '#4DB6AC',
      dark: '#00867D',
      contrastText: '#ffffff',
    },
    background: {
      default: '#F5F7FA',
      paper: '#ffffff',
    },
    text: {
      primary: '#2C3E50',
      secondary: '#546E7A',
    }
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#2b2a29',
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1A237E',
          borderRight: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: '8px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          },
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          margin: '4px 8px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(255,255,255,0.12)',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.16)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.08)',
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: '#ffffff',
          minWidth: '40px',
          '& .MuiSvgIcon-root': {
            fontSize: '1.3rem',
          },
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          color: '#ffffff',
          fontSize: '0.875rem',
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          borderRadius: '12px',
        },
      },
    },
  },
});

// Create a wrapper component to handle auth routing
const AuthWrapper = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log('AuthWrapper mounted');
    console.log('Current path:', location.pathname);
    console.log('Is authenticated:', isAuthenticated);
    
    if (!isAuthenticated && location.pathname !== '/login') {
      console.log('Redirecting to login');
      navigate('/login');
    }
  }, [isAuthenticated, location, navigate]);

  console.log('Rendering routes with path:', location.pathname);
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Routes>
        <Route 
          path="/login" 
          element={
            <>
              {console.log('Rendering Login component')}
              <Login />
            </>
          } 
        />
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/" 
          element={
            <>
              {console.log('Redirecting from root to login')}
              <Navigate to="/login" replace />
            </>
          } 
        />
        <Route 
          path="/products" 
          element={isAuthenticated ? <ProductCatalog /> : <Navigate to="/login" />} 
        />
        <Route path="/design-paper-order" element={<DesignPaperOrder />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/inventory" element={
          <ProtectedRoute>
            <InventoryList />
          </ProtectedRoute>
        } />
      </Routes>
    </Box>
  );
};

const App = () => {
  console.log('App component rendering');
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <AuthWrapper />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
