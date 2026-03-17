import React, { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import './index.css';

// Import your publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "PASTE_YOUR_GOOGLE_CLIENT_ID_HERE";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Global Error Boundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', backgroundColor: '#09090b', color: '#ef4444', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Application Crash Detected</h1>
          <p style={{ color: '#a1a1aa', margin: '1rem 0' }}>Something went wrong during the rendering process.</p>
          <pre style={{ backgroundColor: '#18181b', padding: '1rem', borderRadius: '0.5rem', overflow: 'auto', fontSize: '0.8rem', border: '1px border-red-500/20' }}>
            {this.state.error?.message}
            {this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

if (!PUBLISHABLE_KEY) {
  console.error("Missing Publishable Key: Please set VITE_CLERK_PUBLISHABLE_KEY in your .env file.");
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#09090b', color: '#f4f4f5', fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#ef4444' }}>Authentication Setup Incomplete</h1>
        <p style={{ maxWidth: '400px', lineHeight: '1.5', color: '#a1a1aa' }}>
          It looks like the <code>VITE_CLERK_PUBLISHABLE_KEY</code> is missing from your <code>.env</code> file. <br /><br />
          Please copy your Publishable Key from your Clerk Dashboard and restart the development server.
        </p>
      </div>
    </StrictMode>,
  );
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
          <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <App />
          </GoogleOAuthProvider>
        </ClerkProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}

