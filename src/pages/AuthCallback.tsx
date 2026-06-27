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
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-sky-100 via-sky-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Completing Authentication</h2>
            <p className="text-slate-500 text-sm">Please wait while we secure your session...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Welcome to Biovised!</h2>
            <p className="text-slate-500 text-sm">{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Authentication Issue</h2>
            <p className="text-slate-500 text-sm mb-4">{message}</p>
            <p className="text-slate-400 text-xs">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
}
