import React from 'react';
import ReactDOM from 'react-dom/client';
import { StyledEngineProvider } from '@mui/material/styles';
import './index.css';
import App from './App';

console.log('Starting application...');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

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
  console.error('Error rendering application:', error);
}
