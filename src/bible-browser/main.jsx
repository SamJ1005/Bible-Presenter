import React from 'react';
import ReactDOM from 'react-dom/client';
import BibleBrowserApp from './BibleBrowserApp';
import './BibleBrowserApp.css';

const root = document.getElementById('bible-browser-root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <BibleBrowserApp />
    </React.StrictMode>
  );
}
