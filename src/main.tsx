import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// فایل i18n را اینجا import کنید
import './i18n';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <Suspense fallback="Loading translations...">
        <App />
      </Suspense>
    </React.StrictMode>,
  );
} else {
  throw new Error("Root element with id 'root' not found.");
}