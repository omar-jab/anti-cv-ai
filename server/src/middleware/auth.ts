import type { MiddlewareHandler } from "hono";
import { verifyToken } from "@clerk/backend";
import type { AppEnv } from "../db";

export type AuthVariables = {
    userId: string | null;
};

export type AppEnvWithAuth = AppEnv & {
    Variables: AppEnv["Variables"] & AuthVariables;
};

/**
 * Estrae il token JWT dalla richiesta.
 * Prova prima l'header Authorization, poi il cookie __session.
 */
function extractToken(c: { req: { header: (name: string) => string | undefined } }, getCookie: (name: string) => string | undefined): string | null {
    // 1. Authorization header (preferito)
    const authHeader = c.req.header("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.replace("Bearer ", "");
    }

    // 2. Cookie __session (fallback per Clerk)
    const sessionCookie = getCookie("__session");
    if (sessionCookie) {
        return sessionCookie;
    }

    return null;
}

/**
 * Middleware per autenticazione JWT Clerk
 * - Legge token dall'header Authorization o dal cookie __session
 * - Verifica il token con Clerk
 * - Sincronizza l'utente al database
 * - Imposta userId nel context
 */
export const authMiddleware: MiddlewareHandler<AppEnvWithAuth> = async (
    c,
    next,
) => {
    const getCookie = (name: string) => {
        const cookieHeader = c.req.header("Cookie");
        if (!cookieHeader) return undefined;

        const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split("=");
            acc[key] = value;
            return acc;
        }, {} as Record<string, string>);

        return cookies[name];
    };

    const token = extractToken(c, getCookie);

    const authHeader = c.req.header("Authorization");
    console.log("[Auth] Authorization header:", authHeader ? "present" : "missing");
    console.log("[Auth] Token extracted:", !!token);
    console.log("[Auth] Request path:", c.req.path);
    console.log("[Auth] Request method:", c.req.method);

    if (!token) {
        console.log("[Auth] No token found, setting userId to null");
        c.set("userId", null);
        return next();
    }

    try {
        const secretKey = Bun.env.CLERK_SECRET_KEY;
        if (!secretKey) {
            console.error("[Auth] CLERK_SECRET_KEY is not set!");
        }
        const payload = await verifyToken(token, {
            secretKey: secretKey || "",
        });
        const userId = payload.sub;
        console.log("[Auth] User verified:", userId);
        c.set("userId", userId);

        // Sincronizza utente al DB (upsert)
        const db = c.get("db");
        const now = Date.now();
        db.query(
            `INSERT INTO users (id, created_at, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at`,
        ).run(userId, now, now);
    } catch (error) {
        // Token non valido o scaduto
        console.error("[Auth] Verification error:", error);
        c.set("userId", null);
    }

    return next();
};
