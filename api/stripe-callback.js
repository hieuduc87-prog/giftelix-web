// Vercel Serverless - Stripe Connect OAuth Callback
// Exchanges auth code for connected account ID, stores as env var

export default async function handler(req, res) {
    const { code, error, error_description } = req.query;

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const base = `${protocol}://${host}`;

    if (error) {
        return res.redirect(`${base}/setup.html?stripe_error=${encodeURIComponent(error_description || error)}`);
    }

    if (!code) {
        return res.redirect(`${base}/setup.html?stripe_error=no_authorization_code`);
    }

    const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
    if (!STRIPE_KEY) {
        return res.redirect(`${base}/setup.html?stripe_error=server_not_configured`);
    }

    try {
        // Exchange code for connected account
        const tokenResp = await fetch('https://connect.stripe.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_secret: STRIPE_KEY,
                code: code,
                grant_type: 'authorization_code'
            })
        });

        const tokenData = await tokenResp.json();

        if (tokenData.error) {
            return res.redirect(`${base}/setup.html?stripe_error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
        }

        const connectedId = tokenData.stripe_user_id;
        if (!connectedId) {
            return res.redirect(`${base}/setup.html?stripe_error=no_account_returned`);
        }

        // Store connected account ID as encrypted env var on Vercel
        const TOKEN = process.env.VERCEL_TOKEN;
        const PROJECT_ID = process.env.VERCEL_PROJECT_ID;
        const TEAM_ID = process.env.VERCEL_TEAM_ID;
        const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

        if (TOKEN && PROJECT_ID && TEAM_ID) {
            const listResp = await fetch(
                `https://api.vercel.com/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
                { headers }
            );
            const envData = await listResp.json();
            const existing = (envData.envs || []).find(e => e.key === 'STRIPE_CONNECTED_ACCOUNT');

            if (existing) {
                await fetch(
                    `https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${existing.id}?teamId=${TEAM_ID}`,
                    { method: 'PATCH', headers, body: JSON.stringify({ value: connectedId }) }
                );
            } else {
                await fetch(
                    `https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
                    {
                        method: 'POST', headers,
                        body: JSON.stringify({
                            key: 'STRIPE_CONNECTED_ACCOUNT',
                            value: connectedId,
                            type: 'encrypted',
                            target: ['production', 'preview', 'development']
                        })
                    }
                );
            }

            // Trigger redeploy
            const HOOK = process.env.VERCEL_DEPLOY_HOOK;
            if (HOOK) await fetch(HOOK, { method: 'POST' });
        }

        return res.redirect(`${base}/setup.html?stripe_connected=true`);

    } catch (e) {
        return res.redirect(`${base}/setup.html?stripe_error=${encodeURIComponent(e.message)}`);
    }
}
