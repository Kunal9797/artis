import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Container,
  Alert,
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
      const result = await authApi.login(username, password);
      await login(result.data.token, result.data.user);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid credentials');
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
          }}
        >
          <Box 
            sx={{ 
              p: 4,
              display: 'flex', 
              alignItems: 'center', 
              flexDirection: 'column',
              backgroundColor: '#2b2a29',
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
                marginBottom: '8px',
                filter: 'brightness(1.2) contrast(1.2)'
              }}
            />
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: '#ffffff !important',
                mt: 1,
                fontWeight: 500,
                letterSpacing: '0.5px'
              }}
            >
              Inventory Management Portal
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
              <Alert severity="error" sx={{ mb: 2 }}>
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
              sx={{ mb: 2 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
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
                letterSpacing: '0.5px'
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