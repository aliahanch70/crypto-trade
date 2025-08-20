import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Suspense } from 'react';
import App from './App.tsx';
import './index.css';
import './i18n'; // <- این خط مهم است


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback="Loading...">
      <App />
    </Suspense>
  </StrictMode>
);
