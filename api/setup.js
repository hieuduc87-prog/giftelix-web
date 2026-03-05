// Vercel Serverless Function - Secure API key setup
// Env vars needed: VERCEL_TOKEN, VERCEL_DEPLOY_HOOK, SETUP_PASSWORD

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { password, apiKey, stripeKey, action } = req.body || {};
    const PASS = process.env.SETUP_PASSWORD || 'giftelix2025';

    if (password !== PASS) {
        return res.status(401).json({ error: 'Wrong password' });
    }

    const TOKEN = process.env.VERCEL_TOKEN;
    if (!TOKEN) {
        return res.status(500).json({ error: 'Server not configured. Ask the developer to set VERCEL_TOKEN.' });
    }

    const PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_HNy8GwgiUoID3NcmOkZBJYDA2nTg';
    const TEAM_ID = process.env.VERCEL_TEAM_ID || 'team_io5B4D9gkpivVZ1IknFk2qH0';
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
            if (!updateResp.ok) {
                const err = await updateResp.text();
                throw new Error(`Failed to update ${key}: ${err}`);
            }
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
            if (!createResp.ok) {
                const err = await createResp.text();
                throw new Error(`Failed to create ${key}: ${err}`);
            }
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

        // --- Set Snipcart API Key (legacy, kept for compatibility) ---
        if (action === 'set-api-key') {
            if (!apiKey || apiKey.length < 10) {
                return res.status(400).json({ error: 'Invalid API key' });
            }
            await setEnvVar('SNIPCART_API_KEY', apiKey);
            const redeployed = await triggerRedeploy();

            return res.json({
                success: true,
                message: 'API key saved securely. Site is redeploying...',
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
            const hasSnipcart = envs.some(e => e.key === 'SNIPCART_API_KEY');

            return res.json({
                stripeConfigured: hasStripe,
                snipcartConfigured: hasSnipcart,
                message: hasStripe ? 'Stripe is configured' : 'Stripe not set up yet'
            });
        }

        return res.status(400).json({ error: 'Unknown action' });
    } catch (err) {
        return res.status(500).json({ error: 'Server error', detail: err.message });
    }
}
