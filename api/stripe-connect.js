// Vercel Serverless - Redirect to Stripe Connect OAuth
// Env: STRIPE_CLIENT_ID (from Stripe Connect settings)

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const CLIENT_ID = process.env.STRIPE_CLIENT_ID;
    if (!CLIENT_ID) {
        // OAuth not configured - redirect back to setup with fallback flag
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        return res.redirect(302, `${protocol}://${host}/setup.html?use_manual=true`);
    }

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const redirectUri = `${protocol}://${host}/api/stripe-callback`;

    const url = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${encodeURIComponent(CLIENT_ID)}&scope=read_write&redirect_uri=${encodeURIComponent(redirectUri)}`;

    res.redirect(302, url);
}
