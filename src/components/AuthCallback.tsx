import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    // Handle the OAuth callback hash
    const handleAuthCallback = async () => {
      try {
        // Supabase automatically handles the hash params
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
          setStatus('Authentication successful! Redirecting...');
          // Navigate to home or dashboard after successful auth
          setTimeout(() => {
            navigate('/');
          }, 1000);
        } else {
          setStatus('No session found. Redirecting to login...');
          setTimeout(() => {
            navigate('/');
          }, 1500);
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setStatus(`Authentication failed: ${err?.message || 'Unknown error'}`);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#0E0E10',
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '2px solid #1A1A1A',
        borderTop: '2px solid #ffffff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        marginBottom: '24px'
      }} />
      <h2 style={{
        fontSize: '14px',
        fontWeight: 700,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        marginBottom: '12px'
      }}>
        Biovised Account
      </h2>
      <p style={{
        fontSize: '11px',
        color: '#a1a1aa',
        fontFamily: 'JetBrains Mono, monospace'
      }}>
        {status}
      </p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
