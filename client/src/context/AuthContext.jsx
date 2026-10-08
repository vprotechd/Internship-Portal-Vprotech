import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (form) => {
    const { data } = await api.post('/auth/login', form);
    setUser(data.user);
    return data.user;
  };

  const register = async (form) => {
    const { data } = await api.post('/auth/register', form);
    return data;
  };

  const selectDomain = async (domainId) => {
    const { data } = await api.put('/auth/domain', { domainId });
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } finally { setUser(null); }
  };

  return <Ctx.Provider value={{ user, loading, login, register, selectDomain, logout }}>{children}</Ctx.Provider>;
}
