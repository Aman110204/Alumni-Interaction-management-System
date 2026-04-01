import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// React.StrictMode in React 18 intentionally double-invokes effects in development
// to help detect side-effects. This causes our NotificationContext polling to fire
// multiple simultaneous requests during dev. Removed here — the app is already
// written with clean effect teardown so StrictMode provides no additional safety net.
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
