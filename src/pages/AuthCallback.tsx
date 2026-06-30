import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // First check URL query params for errors passed back from Supabase
        const params = new URLSearchParams(window.location.search);
        const errorDescription = params.get('error_description');
        const errorCode = params.get('error_code');
        
        if (errorDescription) {
          throw new Error(`${errorDescription} (${errorCode || 'unknown_code'})`);
        }

        // Supabase will automatically handle the OAuth callback hash params
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
          setStatus('success');
          setMessage('Authentication successful! Redirecting...');
          
          // Store session info if needed
          localStorage.setItem('biovised_auth_status', 'authenticated');
          
          // Redirect to dashboard or home after a brief delay
          setTimeout(() => {
            navigate('/');
          }, 1500);
        } else {
          throw new Error('No session found');
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setMessage(err?.message || 'Authentication failed. Please try again.');
        
        // Redirect to login after error
        setTimeout(() => {
          navigate('/');
        }, 4000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 selection:bg-white selection:text-black">
      <div className="max-w-md w-full bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-900 p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Completing Authentication</h2>
            <p className="text-zinc-450 text-xs font-mono">Please wait while we secure your session...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4 animate-bounce" />
            <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Welcome to Biovised!</h2>
            <p className="text-zinc-300 text-sm font-sans">{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Authentication Issue</h2>
            <p className="text-rose-450 text-xs font-mono mb-4 leading-relaxed">{message}</p>
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-wider">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
}
