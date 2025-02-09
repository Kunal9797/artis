import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Container,
  Alert,
  Divider
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import Logo from '../assets/artislogo.png';
import ArtisLogoText from '../assets/artislaminatestext.png';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (!username.trim()) {
        setError('Username is required');
        return;
      }
      
      const result = await authApi.login(username, password);
      const { token, user } = result.data;
      
      if (!user || !user.role) {
        throw new Error('Invalid user data received');
      }

      await login(token, user);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Invalid username or password');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            width: '100%',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <Box 
            sx={{ 
              p: 4,
              display: 'flex', 
              alignItems: 'center', 
              flexDirection: 'column',
              backgroundColor: '#2b2a29',
              position: 'relative',
              zIndex: 1
            }}
          >
            <img 
              src={Logo} 
              alt="Artis Laminate" 
              style={{ 
                height: '100px',
                marginBottom: '5px',
                filter: 'brightness(1.2) contrast(1.2)'
              }} 
            />
            <img
              src={ArtisLogoText}
              alt="Artis Laminate Text"
              style={{
                height: '40px',
                marginBottom: '12px',
                filter: 'brightness(1.2) contrast(1.2)'
              }}
            />
            <Divider sx={{ width: '80%', bgcolor: 'rgba(255,255,255,0.1)', my: 2 }} />
            <Typography 
              variant="h6" 
              component="div"
              sx={{ 
                color: '#FFD700 !important',
                fontWeight: 600,
                letterSpacing: '0.5px',
                textAlign: 'center',
                mb: 1,
                position: 'relative',
                zIndex: 2,
                textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                '& span': {
                  color: '#FFD700 !important'
                }
              }}
            >
              <span>Sales & Inventory Management</span>
            </Typography>
            <Typography 
              variant="subtitle2" 
              component="div"
              sx={{ 
                color: '#FFFFFF !important',
                mt: 1,
                fontWeight: 400,
                letterSpacing: '0.5px',
                textAlign: 'center',
                position: 'relative',
                zIndex: 2
              }}
            >
              Track Sales • Manage Inventory • Monitor Performance
            </Typography>
          </Box>

          <Box 
            component="form" 
            onSubmit={handleSubmit} 
            sx={{ 
              p: 4,
              backgroundColor: '#fff'
            }}
          >
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 2,
                  borderRadius: 1,
                  '& .MuiAlert-icon': {
                    color: 'error.main'
                  }
                }}
              >
                {error}
              </Alert>
            )}
            <TextField
              margin="normal"
              required
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                }
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ 
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                }
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                py: 1.5,
                backgroundColor: '#2b2a29',
                '&:hover': {
                  backgroundColor: '#404040'
                },
                fontWeight: 600,
                letterSpacing: '0.5px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transition: 'all 0.3s ease'
              }}
            >
              Sign In
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login; 