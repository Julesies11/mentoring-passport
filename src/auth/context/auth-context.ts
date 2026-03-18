import { createContext, useContext } from 'react';
import { AuthModel, UserModel, UserRole } from '@/auth/lib/models';

// Create AuthContext with types
export const AuthContext = createContext<{
  loading: boolean;
  setLoading: (loading: boolean) => void;
  auth: AuthModel | undefined;
  saveAuth: (auth: AuthModel | undefined) => void;
  user: UserModel | undefined;
  setUser: (user: UserModel | undefined) => void;
  login: (email: string, password: string) => Promise<UserModel | undefined>;
  register: (email: string, password: string, metadata: any) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (password: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  getUser: () => Promise<UserModel | undefined>;
  updateProfile: (userData: Partial<UserModel>) => Promise<UserModel | undefined>;
  logout: () => void;
  verify: () => Promise<void>;
  isSysAdmin: boolean;
  role: UserRole | undefined;
  profileId: string | undefined;
  isOrgAdmin: boolean;
  isSupervisor: boolean;
  isMentor: boolean;
  isMentee: boolean;
  setIsMentor: (isMentor: boolean) => void;
  setIsMentee: (isMentee: boolean) => void;
}>({
  loading: true,
  setLoading: () => {},
  auth: undefined,
  saveAuth: () => {},
  user: undefined,
  setUser: () => {},
  login: async () => undefined,
  register: async () => {},
  requestPasswordReset: async () => {},
  resetPassword: async () => {},
  resendVerificationEmail: async () => {},
  getUser: async () => undefined,
  updateProfile: async () => undefined,
  logout: () => {},
  verify: async () => {},
  isSysAdmin: false,
  role: undefined,
  profileId: undefined,
  isOrgAdmin: false,
  isSupervisor: false,
  isMentor: false,
  isMentee: false,
  setIsMentor: () => {},
  setIsMentee: () => {},
});

// Hook definition
export function useAuth() {
  return useContext(AuthContext);
}
