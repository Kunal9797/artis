import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Container
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Logo from '../assets/artislogo.png';
import { login as apiLogin } from '../services/api';

const Login: React.FC = () => {
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const data = await apiLogin(email, password);
      authLogin(data.token, data.user);
      navigate('/dashboard', { replace: true });
    } catch (error: any) {
      console.error('Login failed:', error);
      setError(error.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F7FA',
      }}
    >
      <Container maxWidth="xs" sx={{ margin: 0 }}>
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            borderRadius: 2,
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}
        >
          <Box 
            sx={{ 
              p: 3, 
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
                height: '80px',
                marginBottom: '16px',
                filter: 'brightness(1.2) contrast(1.2)'
              }} 
            />
            <Typography 
              variant="h5" 
              sx={{ 
                color: '#fecc00',
                fontWeight: 600,
                letterSpacing: '-0.5px',
                mb: 1
              }}
            >
              Artis Laminate
            </Typography>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: '#ffffff',
                mt: 1
              }}
            >
              Inventory Management Portal
            </Typography>
          </Box>

          <Box sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              {error && (
                <Typography 
                  color="error" 
                  variant="body2" 
                  sx={{ mb: 2, textAlign: 'center' }}
                >
                  {error}
                </Typography>
              )}
              <TextField
                margin="normal"
                required
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                error={!!error}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!error}
              />
              <Button
                fullWidth
                variant="contained"
                type="submit"
                sx={{
                  mt: 3,
                  mb: 2,
                  backgroundColor: '#fecc00',
                  color: '#000000',
                  '&:hover': {
                    backgroundColor: '#e5b800'
                  }
                }}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login; 