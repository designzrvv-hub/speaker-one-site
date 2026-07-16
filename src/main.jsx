import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

const visualEditingBuild = import.meta.env.DEV
  || import.meta.env.VITE_ENABLE_VISUAL_EDITING === 'true';
const visualPreviewPage = document.querySelector('meta[data-sanity-preview]') !== null;

if (visualEditingBuild && visualPreviewPage) {
  import('./preview/enableVisualEditing.js')
    .then(({startVisualEditing}) => startVisualEditing())
    .catch((error) => {
      if (import.meta.env.DEV) console.error('[Speaker One preview] Visual Editing не запущен:', error);
    });
}
