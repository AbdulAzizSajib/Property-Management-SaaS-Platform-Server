import { CookieOptions, Request, Response } from "express";
import { envVars } from "../config/env";

const isProd = () => envVars.NODE_ENV === "production";

// In production, secure cookies set with `secure: true` get a `__Secure-` prefix
// added by the browser/Better Auth. Reading must account for both names.
const SESSION_COOKIE = "better-auth.session_token";
const SECURE_SESSION_COOKIE = `__Secure-${SESSION_COOKIE}`;

const setCookie = (res: Response, key: string, value: string, options: CookieOptions) => {
    res.cookie(key, value, options);
}

const getCookie = (req: Request, key: string) => {
    return req.cookies[key];
}

const clearCookie = (res: Response, key: string, options: CookieOptions) => {
    res.clearCookie(key, options);
    // Also clear the secure-prefixed variant that exists in production.
    res.clearCookie(`__Secure-${key}`, options);
}

// Reads the Better Auth session token regardless of environment.
// Production stores it as `__Secure-better-auth.session_token`,
// development as `better-auth.session_token`.
const getSessionToken = (req: Request): string | undefined => {
    return (
        req.cookies[SECURE_SESSION_COOKIE] ||
        req.cookies[SESSION_COOKIE] ||
        undefined
    );
}

// The cookie name to write the session token to, per environment.
const getSessionCookieName = () =>
    isProd() ? SECURE_SESSION_COOKIE : SESSION_COOKIE;

export const CookieUtils = {
    setCookie,
    getCookie,
    clearCookie,
    getSessionToken,
    getSessionCookieName,
}