import { create } from 'zustand';
import { UserDTO } from 'shared-types';

interface AuthState {
  token: string | null;
  user: UserDTO | null;
  isAuthenticated: boolean;
  login: (token: string, user: UserDTO) => void;
  logout: () => void;
  updateUser: (updatedFields: Partial<UserDTO>) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Safe SSR check for localStorage
  const isClient = typeof window !== 'undefined';
  const savedToken = isClient ? localStorage.getItem('ce_token') : null;
  const savedUser = isClient ? localStorage.getItem('ce_user') : null;

  return {
    token: savedToken,
    user: savedUser ? JSON.parse(savedUser) : null,
    isAuthenticated: !!savedToken,

    login: (token, user) => {
      if (isClient) {
        localStorage.setItem('ce_token', token);
        localStorage.setItem('ce_user', JSON.stringify(user));
      }
      set({ token, user, isAuthenticated: true });
    },

    logout: () => {
      if (isClient) {
        localStorage.removeItem('ce_token');
        localStorage.removeItem('ce_user');
      }
      set({ token: null, user: null, isAuthenticated: false });
    },

    updateUser: (updatedFields) => {
      set((state) => {
        if (!state.user) return state;
        const newUser = { ...state.user, ...updatedFields };
        if (isClient) {
          localStorage.setItem('ce_user', JSON.stringify(newUser));
        }
        return { user: newUser };
      });
    },
  };
});
