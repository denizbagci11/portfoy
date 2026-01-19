import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                // Hardcoded checks for the specific admin user
                if (
                    credentials?.username === "deniz.bagci" &&
                    credentials?.password === "7WC?d7e]9s9q"
                ) {
                    // Return the user object if valid
                    return {
                        id: "1",
                        name: "Dbank Admin",
                        email: "admin@dbank.com",
                        role: "admin",
                    };
                }

                // Return null if invalid
                return null;
            },
        }),
    ],
    pages: {
        signIn: "/login", // Redirect strict protections here
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname === "/" || nextUrl.pathname.startsWith("/analiz") || nextUrl.pathname.startsWith("/transactions");
            const isOnLogin = nextUrl.pathname.startsWith("/login");

            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
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
