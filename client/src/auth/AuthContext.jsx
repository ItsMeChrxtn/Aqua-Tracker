import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('aquatrack_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((res) => setUser(res.user))
      .catch(() => {
        localStorage.removeItem('aquatrack_token');
        localStorage.removeItem('aquatrack_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const startSession = useCallback((res) => {
    localStorage.setItem('aquatrack_token', res.token);
    localStorage.setItem('aquatrack_user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  }, []);

  const login = useCallback(
    async (email, password) => startSession(await authApi.login({ email, password })),
    [startSession]
  );

  // Registration doesn't sign in: the account must first be verified with
  // the emailed OTP (see verifyEmail).
  const register = useCallback((data) => authApi.register(data), []);

  const verifyEmail = useCallback(
    async (email, otp) => startSession(await authApi.verifyEmail({ email, otp })),
    [startSession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('aquatrack_token');
    localStorage.removeItem('aquatrack_user');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await authApi.me();
    setUser(res.user);
    localStorage.setItem('aquatrack_user', JSON.stringify(res.user));
    return res.user;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verifyEmail, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
