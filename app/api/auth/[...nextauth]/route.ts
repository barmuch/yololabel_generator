import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDatabase } from '@/lib/mongodb';

// Set environment variable for Vercel deployment
if (process.env.VERCEL_URL && !process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const authOptions: NextAuthOptions = {
  session: { 
    strategy: 'jwt' as const 
  },
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: '/login'
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.role = token.role;
        session.user.username = token.username;
      }
      return session;
    },
    async redirect({ url, baseUrl }: any) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials) return null;
        
        try {
          const parsed = credentialsSchema.safeParse(credentials);
          if (!parsed.success) {
            console.log('Credentials validation failed');
            return null;
          }
          
          const { username, password } = parsed.data;
          const db = await getDatabase();
          const user = await db.collection('users').findOne({ username });
          
          if (!user) {
            console.log('User not found:', username);
            return null;
          }
          
          if (!user.passwordHash) {
            console.log('No password hash for user:', username);
            return null;
          }
          
          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) {
            console.log('Invalid password for user:', username);
            return null;
          }
          
          return {
            id: user.id || user._id.toString(),
            username: user.username,
            name: user.name || user.username,
            role: user.role || 'member'
          };
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      }
    })
  ]
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
