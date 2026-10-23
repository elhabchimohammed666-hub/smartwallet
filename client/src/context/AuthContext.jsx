import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('smartwallet_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('smartwallet_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          localStorage.setItem('smartwallet_user', JSON.stringify(res.data.user));
        } catch (err) {
          console.error('Failed to load user', err);
          logout();
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('smartwallet_token', newToken);
    localStorage.setItem('smartwallet_user', JSON.stringify(userData));
    return userData;
  };

  const register = async (name, email, password, preferredCurrency = 'MAD') => {
    const res = await api.post('/auth/register', { name, email, password, preferredCurrency });
    const { token: newToken, user: userData } = res.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('smartwallet_token', newToken);
    localStorage.setItem('smartwallet_user', JSON.stringify(userData));
    return userData;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('smartwallet_token');
    localStorage.removeItem('smartwallet_user');
  };

  const updateProfile = async (updateData) => {
    const res = await api.put('/auth/profile', updateData);
    setUser(res.data.user);
    localStorage.setItem('smartwallet_user', JSON.stringify(res.data.user));
    return res.data.user;
  };

  const formatCurrency = (amount) => {
    const cur = user?.preferredCurrency || 'MAD';
    const num = Number(amount || 0);

    const formattedNum = num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    if (cur === 'MAD') {
      return `${formattedNum} MAD`;
    }
    if (cur === 'USD') return `$${formattedNum}`;
    if (cur === 'EUR') return `€${formattedNum}`;
    if (cur === 'GBP') return `£${formattedNum}`;
    return `${formattedNum} ${cur}`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        formatCurrency,
        currency: user?.preferredCurrency || 'MAD'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
