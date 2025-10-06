import React from 'react';
import ReactDOM from 'react-dom/client';
import { Theme, presetGpnDefault } from '@consta/uikit/Theme';
import App from './App';
import './main.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Theme preset={presetGpnDefault} direction="ltr">
      <App />
    </Theme>
  </React.StrictMode>
);
