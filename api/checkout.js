// Vercel Serverless - Create Stripe Checkout Session
// Env: STRIPE_SECRET_KEY, optional STRIPE_CONNECTED_ACCOUNT

// Server-side product price catalog — source of truth
const PRODUCT_PRICES = {
    // Magnets: $12.99
    'GFX-001': 12.99, 'GFX-002': 12.99, 'GFX-003': 12.99, 'GFX-004': 12.99,
    'GFX-005': 12.99, 'GFX-006': 12.99, 'GFX-007': 12.99, 'GFX-008': 12.99,
    'GFX-009': 12.99, 'GFX-010': 12.99, 'GFX-011': 12.99, 'GFX-012': 12.99,
    'GFX-013': 12.99, 'GFX-014': 12.99, 'GFX-015': 12.99, 'GFX-016': 12.99,
    'GFX-017': 12.99, 'GFX-018': 12.99, 'GFX-019': 12.99, 'GFX-020': 12.99,
    'GFX-021': 12.99, 'GFX-022': 12.99, 'GFX-023': 12.99, 'GFX-024': 12.99,
    // Suncatchers: $16.99
    'GFX-025': 16.99, 'GFX-026': 16.99, 'GFX-027': 16.99, 'GFX-028': 16.99,
    'GFX-029': 16.99, 'GFX-030': 16.99, 'GFX-031': 16.99, 'GFX-032': 16.99,
    'GFX-033': 16.99, 'GFX-034': 16.99, 'GFX-035': 16.99, 'GFX-036': 16.99,
    'GFX-037': 16.99, 'GFX-038': 16.99, 'GFX-039': 16.99, 'GFX-040': 16.99,
    // Ornaments: $14.99
    'GFX-041': 14.99, 'GFX-042': 14.99, 'GFX-043': 14.99, 'GFX-044': 14.99,
    'GFX-045': 14.99, 'GFX-046': 14.99, 'GFX-047': 14.99, 'GFX-048': 14.99,
    'GFX-049': 14.99, 'GFX-050': 14.99, 'GFX-051': 14.99, 'GFX-052': 14.99,
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
    if (!STRIPE_KEY) {
        return res.status(500).json({ error: 'Stripe not configured. Complete setup at /setup.html' });
    }

    const CONNECTED_ACCOUNT = process.env.STRIPE_CONNECTED_ACCOUNT;

    const { items, successUrl, cancelUrl } = req.body || {};
    if (!items || !items.length) {
        return res.status(400).json({ error: 'Cart is empty' });
    }

    if (items.length > 50) {
        return res.status(400).json({ error: 'Too many items' });
    }

    // Validate and use server-side prices
    const validatedItems = [];
    for (const item of items) {
        const id = String(item.id || '').toUpperCase();
        const serverPrice = PRODUCT_PRICES[id];

        if (!serverPrice) {
            return res.status(400).json({ error: `Unknown product: ${id}` });
        }

        const qty = Math.max(1, Math.min(99, parseInt(item.quantity) || 1));

        validatedItems.push({
            id,
            name: String(item.name || id).slice(0, 200),
            price: serverPrice, // Always use server-side price
            quantity: qty,
            description: String(item.description || '').slice(0, 500),
            image: item.image || ''
        });
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

    validatedItems.forEach((item, i) => {
        const price = Math.round(item.price * 100); // cents
        params.append(`line_items[${i}][price_data][currency]`, 'usd');
        params.append(`line_items[${i}][price_data][unit_amount]`, String(price));
        params.append(`line_items[${i}][price_data][product_data][name]`, item.name);
        if (item.description) {
            params.append(`line_items[${i}][price_data][product_data][description]`, item.description);
        }
        if (item.image) {
            params.append(`line_items[${i}][price_data][product_data][images][]`, item.image);
        }
        params.append(`line_items[${i}][quantity]`, String(item.quantity));
    });

    try {
        const headers = {
            'Authorization': `Bearer ${STRIPE_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        };

        if (CONNECTED_ACCOUNT) {
            headers['Stripe-Account'] = CONNECTED_ACCOUNT;
        }

        const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers,
            body: params.toString()
        });

        const session = await resp.json();

        if (session.error) {
            return res.status(400).json({ error: 'Payment session creation failed' });
        }

        return res.json({ url: session.url, sessionId: session.id });
    } catch (err) {
        return res.status(500).json({ error: 'Checkout failed' });
    }
}
