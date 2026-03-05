import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "./db";

const isProduction = process.env.NODE_ENV === "production";

// NEXTAUTH_SECRET Validierung
const getNextAuthSecret = (): string => {
  const secret = process.env.NEXTAUTH_SECRET;
  
  if (!secret && isProduction) {
    console.error('\n========================================');
    console.error('KRITISCHER FEHLER: NEXTAUTH_SECRET fehlt!');
    console.error('========================================');
    console.error('Die App kann ohne NEXTAUTH_SECRET nicht sicher betrieben werden.');
    console.error('Bitte setzen Sie NEXTAUTH_SECRET in der .env Datei:');
    console.error('');
    console.error('  NEXTAUTH_SECRET="<mindestens-32-zeichen-langer-zufallsstring>"');
    console.error('');
    console.error('Generieren Sie einen sicheren Schlüssel mit:');
    console.error('  openssl rand -base64 32');
    console.error('========================================\n');
    throw new Error('NEXTAUTH_SECRET ist in der Produktionsumgebung erforderlich. Bitte setzen Sie die Umgebungsvariable.');
  }
  
  if (!secret) {
    // Development-Fallback (nur für lokale Entwicklung!)
    console.warn('\n⚠️  WARNUNG: NEXTAUTH_SECRET nicht gesetzt - verwende Development-Fallback');
    console.warn('   Dies ist NICHT für Produktionsumgebungen geeignet!\n');
    return 'development-fallback-secret-not-for-production-use-32chars';
  }
  
  if (secret.length < 32) {
    console.warn('\n⚠️  WARNUNG: NEXTAUTH_SECRET ist zu kurz (< 32 Zeichen)');
    console.warn('   Für maximale Sicherheit sollte der Schlüssel mindestens 32 Zeichen lang sein.\n');
  }
  
  return secret;
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: getNextAuthSecret(),
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 Stunden
  },
  cookies: {
    sessionToken: {
      // __Secure- Prefix nur in Production (erfordert HTTPS)
      name: isProduction 
        ? `__Secure-next-auth.session-token` 
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login", // Fehlerseite auf Login umleiten
  },
  debug: !isProduction, // Debug-Logging in Development
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          });

          if (!user || !user?.password) {
            return null;
          }

          // Prüfe ob Account aktiv ist
          if (!user.isActive) {
            console.warn(`Login attempt for deactivated account: ${user.email}`);
            return null;
          }

          const isPasswordValid = await compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          // Update lastLogin
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          }).catch(err => console.error('Failed to update lastLogin:', err));

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          id: user.id,
          role: (user as { role?: string }).role,
        };
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          role: token.role,
        },
      };
    },
  },
};
