// Vercel Serverless Function - Secure API key setup
// Env vars needed: VERCEL_TOKEN, VERCEL_DEPLOY_HOOK, SETUP_PASSWORD

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { password, apiKey, action } = req.body || {};
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

    try {
        if (action === 'set-api-key') {
            if (!apiKey || apiKey.length < 10) {
                return res.status(400).json({ error: 'Invalid API key' });
            }

            // List existing env vars
            const listResp = await fetch(
                `https://api.vercel.com/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
                { headers }
            );
            const envData = await listResp.json();
            const existing = (envData.envs || []).find(e => e.key === 'SNIPCART_API_KEY');

            if (existing) {
                // Update existing
                const updateResp = await fetch(
                    `https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${existing.id}?teamId=${TEAM_ID}`,
                    { method: 'PATCH', headers, body: JSON.stringify({ value: apiKey }) }
                );
                if (!updateResp.ok) {
                    const err = await updateResp.text();
                    return res.status(500).json({ error: 'Failed to update env var', detail: err });
                }
            } else {
                // Create new
                const createResp = await fetch(
                    `https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
                    {
                        method: 'POST', headers,
                        body: JSON.stringify({
                            key: 'SNIPCART_API_KEY',
                            value: apiKey,
                            type: 'encrypted',
                            target: ['production', 'preview', 'development']
                        })
                    }
                );
                if (!createResp.ok) {
                    const err = await createResp.text();
                    return res.status(500).json({ error: 'Failed to create env var', detail: err });
                }
            }

            // Trigger redeploy via deploy hook
            const HOOK = process.env.VERCEL_DEPLOY_HOOK;
            if (HOOK) {
                await fetch(HOOK, { method: 'POST' });
            }

            return res.json({
                success: true,
                message: 'API key saved securely. Site is redeploying...',
                redeployed: !!HOOK
            });
        }

        if (action === 'check-status') {
            // Check if SNIPCART_API_KEY is set
            const listResp = await fetch(
                `https://api.vercel.com/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
                { headers }
            );
            const envData = await listResp.json();
            const hasKey = (envData.envs || []).some(e => e.key === 'SNIPCART_API_KEY');

            return res.json({
                snipcartConfigured: hasKey,
                message: hasKey ? 'Snipcart API key is configured' : 'Snipcart API key not set yet'
            });
        }

        return res.status(400).json({ error: 'Unknown action' });
    } catch (err) {
        return res.status(500).json({ error: 'Server error', detail: err.message });
    }
}
