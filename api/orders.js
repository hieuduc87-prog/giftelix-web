// Vercel Serverless - Fetch orders from Stripe
// Env: STRIPE_SECRET_KEY, JWT_SECRET (required), optional STRIPE_CONNECTED_ACCOUNT
import { createHmac, timingSafeEqual } from 'crypto';

const ALLOWED_ORIGINS = ['https://giftelix.com', 'https://www.giftelix.com'];

function getAllowedOrigin(req) {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
    return ALLOWED_ORIGINS[0];
}

function safeEqual(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) {
        timingSafeEqual(bufA, bufA);
        return false;
    }
    return timingSafeEqual(bufA, bufB);
}

function verifyToken(token) {
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    try {
        const [header, body, sig] = token.split('.');
        const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
        if (!safeEqual(sig, expected)) return null;
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        if (payload.exp && Date.now() > payload.exp) return null;
        return payload;
    } catch { return null; }
}

function requireAuth(req) {
    const cookie = req.headers.cookie || '';
    const match = cookie.match(/gfx_admin=([^;]+)/);
    return match ? verifyToken(match[1]) : null;
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
    const origin = getAllowedOrigin(req);
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!requireAuth(req)) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
    if (!STRIPE_KEY) {
        return res.json({ orders: [], message: 'Stripe not configured' });
    }

    const CONNECTED = process.env.STRIPE_CONNECTED_ACCOUNT;

    try {
        const headers = { 'Authorization': `Bearer ${STRIPE_KEY}` };
        if (CONNECTED) headers['Stripe-Account'] = CONNECTED;

        // Fetch recent checkout sessions
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const resp = await fetch(
            `https://api.stripe.com/v1/checkout/sessions?limit=${limit}&expand[]=data.line_items`,
            { headers }
        );
        const data = await resp.json();

        if (data.error) {
            return res.status(400).json({ error: 'Failed to fetch orders' });
        }

        const orders = (data.data || []).map(session => ({
            id: session.id,
            status: session.payment_status,
            amount: session.amount_total / 100,
            currency: session.currency,
            email: session.customer_details?.email || '',
            name: session.customer_details?.name || '',
            created: session.created,
            items: (session.line_items?.data || []).map(li => ({
                name: li.description,
                qty: li.quantity,
                amount: li.amount_total / 100
            }))
        }));

        // Fetch balance
        const balResp = await fetch('https://api.stripe.com/v1/balance', { headers });
        const balance = await balResp.json();
        const available = (balance.available || []).reduce((s, b) => s + b.amount, 0) / 100;
        const pending = (balance.pending || []).reduce((s, b) => s + b.amount, 0) / 100;

        return res.json({ orders, balance: { available, pending }, total: data.data?.length || 0 });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch orders' });
    }
}
