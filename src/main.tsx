import '@/components/keenicons/assets/styles.css';
import './css/styles.css';
import './setup-global-errors';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { GlobalErrorBoundary } from '@/components/common/error-boundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
);
