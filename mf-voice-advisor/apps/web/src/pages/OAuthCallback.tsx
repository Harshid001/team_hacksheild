import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/axios';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { setAuthData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function handleToken() {
      if (token) {
        // We have the token, but we need the user profile data to complete the auth context
        try {
          // Temporarily set the token on the API so we can fetch the user profile
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Let's quickly hit an endpoint to get the user's data. 
          // We don't have a /me endpoint, but we can decode the JWT if it contains the user ID, 
          // or we can just fetch the profile.
          // Wait, our backend `/api/auth/google/callback` does not return the user object, just the token in the URL.
          // Let's create a quick `/api/auth/me` endpoint in backend or just decode the token?
          // Actually, our previous /api/auth/login returned { accessToken, user }.
          // Let's add `/api/auth/me` in backend to fetch the user details.
          const res = await api.get('/api/auth/me');
          
          setAuthData(token, res.data.user);
          
          if (res.data.user?.hasProfile) {
            navigate('/report', { replace: true });
          } else {
            navigate('/start', { replace: true });
          }
        } catch (error) {
          console.error('Failed to initialize session after OAuth', error);
          navigate('/signup?error=SessionInitFailed', { replace: true });
        }
      } else {
        navigate('/signup?error=NoTokenProvided', { replace: true });
      }
    }

    handleToken();
  }, [token, navigate, setAuthData]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-gray-600 font-medium">Securing your session...</p>
    </div>
  );
}
