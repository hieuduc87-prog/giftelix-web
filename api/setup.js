// Vercel Serverless Function - Secure API key setup
// Env vars needed: VERCEL_TOKEN, VERCEL_DEPLOY_HOOK, SETUP_PASSWORD (required),
//                  VERCEL_PROJECT_ID (required), VERCEL_TEAM_ID (required)
import { timingSafeEqual } from 'crypto';

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

// Rate limiting
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(ip) {
    const now = Date.now();
    const record = attempts.get(ip);
    if (!record || now - record.first > WINDOW_MS) {
        attempts.set(ip, { count: 1, first: now });
        return true;
    }
    record.count++;
    return record.count <= MAX_ATTEMPTS;
}

export default async function handler(req, res) {
    const origin = getAllowedOrigin(req);
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { password, apiKey, stripeKey, action } = req.body || {};
    const PASS = process.env.SETUP_PASSWORD;

    if (!PASS) {
        return res.status(503).json({ error: 'Setup not configured. Set SETUP_PASSWORD env var.' });
    }

    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    if (!checkRateLimit(ip)) {
        return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
    }

    if (!safeEqual(password || '', PASS)) {
        return res.status(401).json({ error: 'Wrong password' });
    }

    const TOKEN = process.env.VERCEL_TOKEN;
    if (!TOKEN) {
        return res.status(500).json({ error: 'Server not configured. Ask the developer to set VERCEL_TOKEN.' });
    }

    const PROJECT_ID = process.env.VERCEL_PROJECT_ID;
    const TEAM_ID = process.env.VERCEL_TEAM_ID;
    if (!PROJECT_ID || !TEAM_ID) {
        return res.status(500).json({ error: 'Server not configured. Set VERCEL_PROJECT_ID and VERCEL_TEAM_ID.' });
    }

    const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

    // Helper: set or update an env var
    async function setEnvVar(key, value) {
        const listResp = await fetch(
            `https://api.vercel.com/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
            { headers }
        );
        const envData = await listResp.json();
        const existing = (envData.envs || []).find(e => e.key === key);

        if (existing) {
            const updateResp = await fetch(
                `https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${existing.id}?teamId=${TEAM_ID}`,
                { method: 'PATCH', headers, body: JSON.stringify({ value }) }
            );
            if (!updateResp.ok) throw new Error('Failed to update env var');
        } else {
            const createResp = await fetch(
                `https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
                {
                    method: 'POST', headers,
                    body: JSON.stringify({
                        key,
                        value,
                        type: 'encrypted',
                        target: ['production', 'preview', 'development']
                    })
                }
            );
            if (!createResp.ok) throw new Error('Failed to create env var');
        }
    }

    // Helper: trigger redeploy
    async function triggerRedeploy() {
        const HOOK = process.env.VERCEL_DEPLOY_HOOK;
        if (HOOK) {
            await fetch(HOOK, { method: 'POST' });
            return true;
        }
        return false;
    }

    try {
        // --- Set Stripe Secret Key ---
        if (action === 'set-stripe-key') {
            if (!stripeKey || stripeKey.length < 10) {
                return res.status(400).json({ error: 'Invalid Stripe key' });
            }
            await setEnvVar('STRIPE_SECRET_KEY', stripeKey);
            const redeployed = await triggerRedeploy();

            return res.json({
                success: true,
                message: 'Stripe secret key saved securely. Site is redeploying...',
                redeployed
            });
        }

        // --- Check Status ---
        if (action === 'check-status') {
            const listResp = await fetch(
                `https://api.vercel.com/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
                { headers }
            );
            const envData = await listResp.json();
            const envs = envData.envs || [];
            const hasStripe = envs.some(e => e.key === 'STRIPE_SECRET_KEY');

            return res.json({
                stripeConfigured: hasStripe,
                message: hasStripe ? 'Stripe is configured' : 'Stripe not set up yet'
            });
        }

        return res.status(400).json({ error: 'Unknown action' });
    } catch (err) {
        return res.status(500).json({ error: 'Server error' });
    }
}
