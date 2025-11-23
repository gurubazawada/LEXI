import { type DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    walletAddress: string;
    username: string;
    profilePictureUrl: string;
  }

  interface Session {
    user: {
      walletAddress: string;
      username: string;
      profilePictureUrl: string;
    } & DefaultSession['user'];
  }
}

// Export everything from the root auth.ts file
export { handlers, signIn, signOut, auth } from '../../auth';
