import React, { createContext, useContext, useEffect, useState } from 'react';
import { account, ID } from '@/lib/appwrite';
import { Models } from 'react-native-appwrite';

interface AuthContextType {
  user: Models.User<Models.Preferences> | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    await account.createEmailPasswordSession(email, pass);
    const currentUser = await account.get();
    setUser(currentUser);
  };

  const signup = async (email: string, pass: string, name?: string) => {
    await account.create(ID.unique(), email, pass, name);
    await login(email, pass);
  };

  const logout = async () => {
    await account.deleteSession('current');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
