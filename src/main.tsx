import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthProvider';
import { DataProvider } from './data/DataProvider';
import { ToastProvider } from './components/ui';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <DataProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </DataProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
);
