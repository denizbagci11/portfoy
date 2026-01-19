import { auth } from "@/auth";

export default auth;

export const config = {
    // Matches all routes except static files and api/auth
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
