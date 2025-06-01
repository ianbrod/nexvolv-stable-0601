// Placeholder auth configuration
// This is a simplified auth setup for development purposes
// In production, you would configure this with your actual auth provider

export const authOptions = {
  // Placeholder auth options
  providers: [],
  callbacks: {
    async session({ session, token }: any) {
      // For development, return a mock session
      return {
        ...session,
        user: {
          id: 'test_user',
          email: 'test@example.com',
          name: 'Test User',
        },
      };
    },
    async jwt({ token, user }: any) {
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
  },
};

// Mock session for development
export const mockSession = {
  user: {
    id: 'test_user',
    email: 'test@example.com',
    name: 'Test User',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
};

// Development-only auth utilities
export const getDevSession = () => mockSession;

export const isAuthenticated = () => true; // Always authenticated in development
