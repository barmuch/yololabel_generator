import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getEnv } from '@/lib/env';
import { getDatabase } from '@/lib/mongodb';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const env = getEnv();
if (!process.env.AUTH_SECRET) {
  console.warn('AUTH_SECRET is not set. Set it in environment for secure sessions.');
}

const credentialsSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6)
});

const authOptions = {
  session: { strategy: 'jwt' as const },
  secret: process.env.AUTH_SECRET || 'dev-insecure-temp-secret-change-me-change-me-1234567890',
  pages: {
    signIn: '/login'
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { username, password } = parsed.data;
        const db = await getDatabase();
        const user = await db.collection('users').findOne({ username });
        if (!user) return null;
        if (!user.passwordHash) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        return {
          id: user.id,
          username: user.username,
            name: user.name || user.username,
            role: user.role || 'member'
        } as any;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    }
  }
};

const handler = NextAuth(authOptions as any);
export { handler as GET, handler as POST };