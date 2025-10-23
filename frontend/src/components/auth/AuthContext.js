import React, { createContext, useContext } from 'react';
import useAuthStore from '../../store/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  return (
    <AuthContext.Provider value={{}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  return {
    user,
    token,
    isAuthenticated
  };
};