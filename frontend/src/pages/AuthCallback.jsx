import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config.js';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const handleAuth = async () => {
      const token = searchParams.get('token');
      const success = searchParams.get('success');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        navigate('/login?error=oauth_failed');
        return;
      }

      if (!success || !token) {
        navigate('/login?error=invalid_callback');
        return;
      }

      try {
        setStatus('Verifying token...');
        
        // Store token
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Fetch user to verify token works
        const response = await axios.get(`${API_BASE_URL}/auth/me`);
        
        if (response.data.user) {
          setStatus('Redirecting...');
          
          // Use full page reload to ensure AuthContext picks up token from localStorage
          // This is more reliable than trying to sync state through events
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 300);
        } else {
          throw new Error('User not found');
        }
      } catch (error) {
        console.error('Failed to authenticate:', error);
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        navigate('/login?error=auth_failed');
      }
    };

    handleAuth();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}

