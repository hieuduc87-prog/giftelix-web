// Vercel Serverless - Admin Authentication
// Env: ADMIN_PASSWORD (required), JWT_SECRET (required)
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

const ALLOWED_ORIGINS = ['https://giftelix.com', 'https://www.giftelix.com'];

function getAllowedOrigin(req) {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
    return ALLOWED_ORIGINS[0];
}

function getSecret() {
    const s = process.env.JWT_SECRET;
    if (!s) throw new Error('JWT_SECRET not configured');
    return s;
}

function getPassword() {
    const p = process.env.ADMIN_PASSWORD;
    if (!p) throw new Error('ADMIN_PASSWORD not configured');
    return p;
}

function safeEqual(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) {
        timingSafeEqual(bufA, bufA); // constant time even on length mismatch
        return false;
    }
    return timingSafeEqual(bufA, bufB);
}

function signToken(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', getSecret()).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
    try {
        const [header, body, sig] = token.split('.');
        const expected = createHmac('sha256', getSecret()).update(`${header}.${body}`).digest('base64url');
        if (!safeEqual(sig, expected)) return null;
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        if (payload.exp && Date.now() > payload.exp) return null;
        return payload;
    } catch { return null; }
}

// Simple in-memory rate limiter (resets per cold start, good enough for serverless)
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip) {
    const now = Date.now();
    const record = loginAttempts.get(ip);
    if (!record || now - record.firstAttempt > WINDOW_MS) {
        loginAttempts.set(ip, { count: 1, firstAttempt: now });
        return true;
    }
    record.count++;
    if (record.count > MAX_ATTEMPTS) return false;
    return true;
}

export default async function handler(req, res) {
    const origin = getAllowedOrigin(req);
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, password } = req.body || {};

    // POST /api/auth - login
    if (req.method === 'POST' && action === 'login') {
        const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
        if (!checkRateLimit(ip)) {
            return res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });
        }

        try {
            const PASS = getPassword();
            if (!safeEqual(password || '', PASS)) {
                return res.status(401).json({ error: 'Wrong password' });
            }
        } catch (e) {
            return res.status(503).json({ error: 'Admin not configured. Set ADMIN_PASSWORD env var.' });
        }

        try {
            const token = signToken({
                role: 'admin',
                iat: Date.now(),
                exp: Date.now() + 24 * 60 * 60 * 1000 // 24h
            });

            res.setHeader('Set-Cookie', `gfx_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`);
            return res.json({ success: true, message: 'Logged in' });
        } catch (e) {
            return res.status(503).json({ error: 'Auth not configured. Set JWT_SECRET env var.' });
        }
    }

    // POST /api/auth - check session
    if (req.method === 'POST' && action === 'check') {
        try {
            const cookie = req.headers.cookie || '';
            const match = cookie.match(/gfx_admin=([^;]+)/);
            const payload = match ? verifyToken(match[1]) : null;

            if (payload) {
                return res.json({ authenticated: true, role: payload.role });
            }
        } catch {}
        return res.status(401).json({ authenticated: false });
    }

    // POST /api/auth - logout
    if (req.method === 'POST' && action === 'logout') {
        res.setHeader('Set-Cookie', 'gfx_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
        return res.json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
}
