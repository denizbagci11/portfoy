import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "./lib/prisma";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                if (!credentials?.username || !credentials?.password) return null;

                const user = await prisma.user.findUnique({
                    where: { username: credentials.username as string }
                });

                if (!user) return null;

                const isValid = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (!isValid) return null;

                return {
                    id: user.id,
                    name: user.name || user.username,
                    email: user.username + "@dbank.com", // Virtual email for session
                    role: user.role,
                };
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname === "/" || nextUrl.pathname.startsWith("/analiz") || nextUrl.pathname.startsWith("/transactions");
            const isOnLogin = nextUrl.pathname.startsWith("/login");
            const isOnAdmin = nextUrl.pathname.startsWith("/admin");

            if (isOnDashboard || isOnAdmin) {
                if (isLoggedIn) {
                    // Admin check for /admin path
                    if (isOnAdmin && (auth.user as any).role !== 'admin') {
                        return Response.redirect(new URL("/", nextUrl));
                    }
                    return true;
                }
                return false;
            } else if (isOnLogin) {
                if (isLoggedIn) {
                    return Response.redirect(new URL("/", nextUrl));
                }
                return true;
            }
            return true;
        },
        jwt({ token, user }) {
            if (user) {
                // @ts-ignore
                token.role = user.role;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user && token.role) {
                // @ts-ignore
                session.user.role = token.role;
            }
            return session;
        },
    },
});

