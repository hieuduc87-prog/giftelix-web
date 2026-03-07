// Vercel Serverless - Fetch single checkout session for success page
// No auth required - only returns limited info for the session owner

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const sessionId = req.query.session_id;
    if (!sessionId || !sessionId.startsWith('cs_')) {
        return res.status(400).json({ error: 'Invalid session ID' });
    }

    const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
    if (!STRIPE_KEY) {
        return res.status(500).json({ error: 'Stripe not configured' });
    }

    const CONNECTED = process.env.STRIPE_CONNECTED_ACCOUNT;

    try {
        const headers = { 'Authorization': `Bearer ${STRIPE_KEY}` };
        if (CONNECTED) headers['Stripe-Account'] = CONNECTED;

        const resp = await fetch(
            `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=line_items`,
            { headers }
        );
        const session = await resp.json();

        if (session.error) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Return minimal info — no full email, no shipping address
        const email = session.customer_details?.email || '';
        const maskedEmail = email ? email.replace(/^(.{2})(.*)(@.*)$/, '$1***$3') : '';

        return res.json({
            status: session.payment_status,
            amount: session.amount_total / 100,
            currency: (session.currency || 'usd').toUpperCase(),
            email: maskedEmail,
            name: session.customer_details?.name ? session.customer_details.name.split(' ')[0] : '',
            items: (session.line_items?.data || []).map(li => ({
                name: li.description,
                qty: li.quantity,
                amount: li.amount_total / 100
            }))
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch order' });
    }
}
