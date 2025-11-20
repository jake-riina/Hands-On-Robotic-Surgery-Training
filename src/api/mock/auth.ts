import type { User } from './types';

// Mock authentication API
export const mockAuth = {
  login: async (email: string, password: string, role: 'trainee' | 'physician'): Promise<User> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock user data based on role
    const mockUser: User = {
      id: '1',
      email,
      name: role === 'trainee' ? 'John Doe' : 'Dr. Jane Smith',
      role,
    };

    // In real app, this would validate credentials
    if (email && password) {
      return mockUser;
    }

    throw new Error('Invalid credentials');
  },

  loginWithGoogle: async (role: 'trainee' | 'physician'): Promise<User> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock user data based on role
    const mockUser: User = {
      id: '1',
      email: 'user@gmail.com',
      name: role === 'trainee' ? 'John Doe' : 'Dr. Jane Smith',
      role,
    };

    return mockUser;
  },

  logout: async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    // In real app, this would clear session/tokens
  },

  getCurrentUser: async (): Promise<User | null> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    // Mock returning current user
    return {
      id: '1',
      email: 'trainee@example.com',
      name: 'John Doe',
      role: 'trainee',
    };
  },
};

