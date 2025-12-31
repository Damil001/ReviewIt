import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config.js';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [tokenSet, setTokenSet] = useState(false);

  // Set token when callback received
  useEffect(() => {
    const token = searchParams.get('token');
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      navigate('/login?error=oauth_failed');
      return;
    }

    if (success && token && !tokenSet) {
      // Store token
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Trigger AuthContext to update
      window.dispatchEvent(new CustomEvent('tokenUpdated'));
      setTokenSet(true);
    } else if (!success && !error) {
      navigate('/login?error=invalid_callback');
    }
  }, [searchParams, navigate, tokenSet]);

  // Navigate to dashboard once user is loaded
  useEffect(() => {
    if (tokenSet && user && !authLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, tokenSet, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">
          {tokenSet ? 'Loading your account...' : 'Completing sign in...'}
        </p>
      </div>
    </div>
  );
}

