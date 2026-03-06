import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import './index.css';

// Import your publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

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
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    </StrictMode>,
  );
}
