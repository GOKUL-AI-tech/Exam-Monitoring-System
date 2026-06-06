import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';

// ── Suppress camera/permissions errors that cause the red dev overlay ──
const IGNORED = [
  'Permissions check failed',
  'Permission denied',
  'NotAllowedError',
  'NotFoundError',
  'Could not start video source',
  'getUserMedia',
  'mediaDevices',
  'The object can not be found here',
];

const shouldIgnore = (msg) => IGNORED.some(e => String(msg).includes(e));

// 1. Suppress window errors
window.onerror = (msg, src, line, col, err) => {
  if (shouldIgnore(msg) || shouldIgnore(err?.message)) return true;
};

// 2. Suppress unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
  if (shouldIgnore(e.reason?.message || e.reason)) e.preventDefault();
});

// 3. Remove the React dev overlay <iframe> whenever it appears
if (process.env.NODE_ENV === 'development') {
  const removeOverlay = () => {
    // React dev overlay is rendered as a shadow-dom iframe or div
    const overlays = document.querySelectorAll(
      'iframe[id^="webpack"], body > div[style*="position: fixed"]'
    );
    overlays.forEach(el => el.remove());

    // Also check shadow root overlays (CRA v5)
    const body = document.body;
    if (body.shadowRoot) {
      const inner = body.shadowRoot.querySelector('div');
      if (inner) {
        const txt = inner.textContent || '';
        if (shouldIgnore(txt)) inner.remove();
      }
    }
  };

  // Watch for overlay being added to DOM
  const observer = new MutationObserver(() => {
    // Check every added node for overlay patterns
    document.querySelectorAll('body > div').forEach(div => {
      if (div.style.zIndex > 9000 || div.style.position === 'fixed') {
        const txt = div.textContent || '';
        if (shouldIgnore(txt)) {
          div.remove();
        }
      }
    });
    removeOverlay();
  });

  observer.observe(document.body, { childList: true, subtree: false });

  // 4. Override console.error to stop React from registering these as errors
  const origConsoleError = console.error;
  console.error = (...args) => {
    const msg = args.join(' ');
    if (shouldIgnore(msg)) return; // swallow it
    origConsoleError(...args);
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
