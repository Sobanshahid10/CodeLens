import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const initAuthFromUrl = useAuthStore((state) => state.initAuthFromUrl);

  useEffect(() => {
    const success = initAuthFromUrl();
    if (success) {
      navigate('/dashboard', { replace: true });
    } else {
      // If no token in URL, check if already authenticated
      const isAuth = useAuthStore.getState().isAuthenticated;
      if (isAuth) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }
  }, [initAuthFromUrl, navigate]);

  return (
    <div className="min-h-screen w-full bg-[#0a0d14] flex flex-col items-center justify-center text-slate-100">
      <Loader2 size={36} className="animate-spin text-indigo-500 mb-4" />
      <h2 className="text-sm font-semibold text-slate-200">Completing GitHub Authentication...</h2>
      <p className="text-xs text-slate-500 mt-1">Storing security credentials in memory.</p>
    </div>
  );
};
