import React from 'react';
import ReactDOM from 'react-dom/client';
import { StyledEngineProvider } from '@mui/material/styles';
import './index.css';
import App from './App';

console.log('=== Application Initialization ===');
console.log('Environment:', process.env.NODE_ENV);
console.log('Base URL:', window.location.origin);
console.log('Current Path:', window.location.pathname);

// Check if root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Critical Error: Root element not found!');
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

try {
  console.log('Attempting to render App component...');
  root.render(
    <React.StrictMode>
      <StyledEngineProvider injectFirst>
        <App />
      </StyledEngineProvider>
    </React.StrictMode>
  );
  console.log('App rendered successfully');
} catch (error) {
  console.error('Critical Error: Failed to render application:', error);
}
