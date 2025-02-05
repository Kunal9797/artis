import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider as CustomThemeProvider } from './context/ThemeContext';
import { CssBaseline, ThemeProvider as MuiThemeProvider } from '@mui/material';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import UserManagement from './components/Users/UserManagement';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  console.log('App component rendering');
  
  React.useEffect(() => {
    console.log('Current route:', window.location.pathname);
  }, []);

  return (
    <AuthProvider>
      <CustomThemeProvider>
        <BrowserRouter>
          <CssBaseline />
          <Routes>
            <Route path="/login" element={
              <>
                <Login />
              </>
            } />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/*" element={
              <>
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </>
            } />
          </Routes>
        </BrowserRouter>
      </CustomThemeProvider>
    </AuthProvider>
  );
};

export default App;
