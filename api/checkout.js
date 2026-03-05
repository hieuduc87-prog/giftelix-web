// Vercel Serverless - Create Stripe Checkout Session
// Env: STRIPE_SECRET_KEY

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
    if (!STRIPE_KEY) {
        return res.status(500).json({ error: 'Stripe not configured. Contact admin.' });
    }

    const { items, successUrl, cancelUrl } = req.body || {};
    if (!items || !items.length) {
        return res.status(400).json({ error: 'Cart is empty' });
    }

    // Build line_items for Stripe
    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', successUrl || 'https://giftelix.com/success.html?session_id={CHECKOUT_SESSION_ID}');
    params.append('cancel_url', cancelUrl || 'https://giftelix.com/index.html');
    params.append('shipping_address_collection[allowed_countries][]', 'US');
    params.append('shipping_options[0][shipping_rate_data][type]', 'fixed_amount');
    params.append('shipping_options[0][shipping_rate_data][fixed_amount][amount]', '0');
    params.append('shipping_options[0][shipping_rate_data][fixed_amount][currency]', 'usd');
    params.append('shipping_options[0][shipping_rate_data][display_name]', 'Free Shipping');
    params.append('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]', 'business_day');
    params.append('shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]', '3');
    params.append('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]', 'business_day');
    params.append('shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]', '7');

    items.forEach((item, i) => {
        const price = Math.round(parseFloat(item.price) * 100); // cents
        params.append(`line_items[${i}][price_data][currency]`, 'usd');
        params.append(`line_items[${i}][price_data][unit_amount]`, String(price));
        params.append(`line_items[${i}][price_data][product_data][name]`, item.name);
        if (item.description) {
            params.append(`line_items[${i}][price_data][product_data][description]`, item.description);
        }
        if (item.image) {
            params.append(`line_items[${i}][price_data][product_data][images][]`, item.image);
        }
        params.append(`line_items[${i}][quantity]`, String(item.quantity || 1));
    });

    try {
        const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRIPE_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        const session = await resp.json();

        if (session.error) {
            return res.status(400).json({ error: session.error.message });
        }

        return res.json({ url: session.url, sessionId: session.id });
    } catch (err) {
        return res.status(500).json({ error: 'Checkout failed', detail: err.message });
    }
}
