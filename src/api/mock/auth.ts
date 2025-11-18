import type { User } from './types';

// Mock authentication API
export const mockAuth = {
  login: async (email: string, password: string): Promise<User> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock user data
    const mockUser: User = {
      id: '1',
      email,
      name: 'John Doe',
      role: 'trainee',
    };

    // In real app, this would validate credentials
    if (email && password) {
      return mockUser;
    }

    throw new Error('Invalid credentials');
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

