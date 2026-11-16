import { createContext, useContext, useEffect, useState } from 'react';
import api, { setStoredToken } from '../api';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then((r) => {
        setUser(r.data.user);
        // Token invalid/expired ho to saaf kar do
        if (!r.data.user) setStoredToken(null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (form) => {
    const { data } = await api.post('/auth/login', form);
    const authenticatedUser = data?.user;
    if (
      !authenticatedUser ||
      !['admin', 'student'].includes(authenticatedUser.role)
    ) {
      throw new Error(
        'The login service returned an invalid response. Check the frontend API URL in Render settings.'
      );
    }

    // Token save karo, taaki agli requests mein Authorization header jaye
    setStoredToken(data.token || null);
    setUser(authenticatedUser);
    return authenticatedUser;
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
    try {
      await api.post('/auth/logout');
    } finally {
      setStoredToken(null);
      setUser(null);
    }
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, selectDomain, logout }}>
      {children}
    </Ctx.Provider>
  );
}