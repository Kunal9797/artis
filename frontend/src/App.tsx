import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider as CustomThemeProvider } from './context/ThemeContext';
import { CssBaseline } from '@mui/material';
import { CircularProgress } from '@mui/material';
import Login from './components/Login';
import DashboardRouter from './components/DashboardRouter';
import RoleRoute from './components/RoleRoute';
import Unauthorized from './components/Unauthorized';
import UserManagement from './components/Users/UserManagement';

const App: React.FC = () => {
  console.log('App - Rendering with path:', window.location.pathname);
  
  return (
    <AuthProvider>
      <CustomThemeProvider>
        <BrowserRouter>
          <CssBaseline />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Admin Routes */}
            <Route 
              path="/users" 
              element={
                <RoleRoute allowedRoles={['admin']}>
                  <UserManagement />
                </RoleRoute>
              } 
            />

            {/* Dashboard Routes */}
            <Route 
              path="/*" 
              element={
                <Suspense fallback={
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100vh' 
                  }}>
                    <CircularProgress />
                  </div>
                }>
                  <RoleRoute allowedRoles={['admin', 'user', 'SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD']}>
                    <DashboardRouter />
                  </RoleRoute>
                </Suspense>
              }
            />
          </Routes>
        </BrowserRouter>
      </CustomThemeProvider>
    </AuthProvider>
  );
};

export default App;
