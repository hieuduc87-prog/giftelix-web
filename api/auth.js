// Vercel Serverless - Admin Authentication
// Env: ADMIN_PASSWORD (default: giftelix2025), JWT_SECRET (auto-generated if not set)
import { createHmac } from 'crypto';

const SECRET = () => process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || 'giftelix2025-secret';

function signToken(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', SECRET()).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
    try {
        const [header, body, sig] = token.split('.');
        const expected = createHmac('sha256', SECRET()).update(`${header}.${body}`).digest('base64url');
        if (sig !== expected) return null;
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        if (payload.exp && Date.now() > payload.exp) return null;
        return payload;
    } catch { return null; }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action, password } = req.body || {};

    // POST /api/auth - login
    if (req.method === 'POST' && action === 'login') {
        const PASS = process.env.ADMIN_PASSWORD || 'giftelix2025';
        if (password !== PASS) {
            return res.status(401).json({ error: 'Wrong password' });
        }

        const token = signToken({
            role: 'admin',
            iat: Date.now(),
            exp: Date.now() + 24 * 60 * 60 * 1000 // 24h
        });

        // Set httpOnly secure cookie
        res.setHeader('Set-Cookie', `gfx_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`);
        return res.json({ success: true, message: 'Logged in' });
    }

    // POST /api/auth - check session
    if (req.method === 'POST' && action === 'check') {
        const cookie = req.headers.cookie || '';
        const match = cookie.match(/gfx_admin=([^;]+)/);
        const payload = match ? verifyToken(match[1]) : null;

        if (payload) {
            return res.json({ authenticated: true, role: payload.role });
        }
        return res.status(401).json({ authenticated: false });
    }

    // POST /api/auth - logout
    if (req.method === 'POST' && action === 'logout') {
        res.setHeader('Set-Cookie', 'gfx_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
        return res.json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
}
