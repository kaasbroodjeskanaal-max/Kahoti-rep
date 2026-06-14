import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely catch and suppress benign WebSocket connection rejections in the sandbox preview
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reasonStr = event.reason ? String(event.reason.message || event.reason) : "";
    if (
      reasonStr.includes("WebSocket") || 
      reasonStr.includes("websocket") || 
      reasonStr.includes("vite") || 
      reasonStr.includes("HMR")
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener("error", (event) => {
    const errorStr = event.message || "";
    if (
      errorStr.includes("WebSocket") || 
      errorStr.includes("websocket") || 
      errorStr.includes("vite") || 
      errorStr.includes("HMR")
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
