import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // <- Import BrowserRouter
import { AuthProvider } from './contexts/AuthContext'; // <- Import AuthProvider
import App from './App.jsx';
import './i18n';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* (FIX) - BrowserRouter باید والد AuthProvider باشد */}
    <BrowserRouter>
      <Suspense fallback="Loading...">
        <AuthProvider>
          <App />
        </AuthProvider>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>,
);