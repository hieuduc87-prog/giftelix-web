// GIFTELIX Cart System - Powered by Stripe Checkout
// Replaces Snipcart. Uses localStorage for cart, /api/checkout for Stripe sessions.
// Compatible with existing snipcart-add-item class names and data attributes.

(function() {
    'use strict';

    const CART_KEY = 'gfx_cart';
    let cart = [];

    // --- Storage ---
    function loadCart() {
        try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
        catch(e) { cart = []; }
    }
    function saveCart() {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        updateCount();
    }

    // --- Cart operations ---
    function addItem(id, name, price, image, description) {
        const existing = cart.find(i => i.id === id);
        if (existing) { existing.quantity++; }
        else { cart.push({ id, name, price: parseFloat(price), image: image || '', description: description || '', quantity: 1 }); }
        saveCart();
        openCart();
        showToast();
    }

    function removeItem(id) {
        cart = cart.filter(i => i.id !== id);
        saveCart();
        renderCart();
    }

    function updateQty(id, delta) {
        const item = cart.find(i => i.id === id);
        if (!item) return;
        item.quantity += delta;
        if (item.quantity < 1) { removeItem(id); return; }
        saveCart();
        renderCart();
    }

    function getTotal() {
        return cart.reduce((s, i) => s + i.price * i.quantity, 0);
    }

    function updateCount() {
        const count = cart.reduce((s, i) => s + i.quantity, 0);
        document.querySelectorAll('.snipcart-items-count, .cart-count, .gfx-cart-count').forEach(el => {
            el.textContent = count;
        });
    }

    // --- UI ---
    function injectUI() {
        // Styles
        const style = document.createElement('style');
        style.textContent = `
#gfx-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;opacity:0;visibility:hidden;transition:all .3s}
#gfx-overlay.open{opacity:1;visibility:visible}
#gfx-sidebar{position:fixed;top:0;right:-420px;width:400px;max-width:92vw;height:100vh;background:#fff;z-index:9999;display:flex;flex-direction:column;transition:right .3s ease;box-shadow:-4px 0 20px rgba(0,0,0,.15);font-family:'Poppins',sans-serif}
#gfx-sidebar.open{right:0}
.gfx-hdr{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #E2E8F0}
.gfx-hdr h3{font-size:18px;font-weight:700;margin:0}
.gfx-close{background:none;border:none;font-size:28px;cursor:pointer;color:#64748B;padding:0 4px;line-height:1}.gfx-close:hover{color:#1E293B}
.gfx-items{flex:1;overflow-y:auto;padding:16px 24px}
.gfx-empty{text-align:center;padding:60px 20px;color:#94A3B8}
.gfx-empty svg{width:48px;height:48px;margin-bottom:16px;opacity:.4}
.gfx-empty p{font-size:15px}
.gfx-ci{display:flex;gap:14px;padding:14px 0;border-bottom:1px solid #F1F5F9}
.gfx-ci-img{width:72px;height:72px;border-radius:8px;object-fit:cover;background:#F7FAFC;flex-shrink:0}
.gfx-ci-info{flex:1;min-width:0}
.gfx-ci-name{font-size:13px;font-weight:600;line-height:1.4;margin-bottom:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.gfx-ci-price{font-size:15px;font-weight:700;color:#E53E3E}
.gfx-ci-qty{display:flex;align-items:center;gap:8px;margin-top:6px}
.gfx-ci-qty button{width:26px;height:26px;border-radius:6px;border:1px solid #E2E8F0;background:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;color:#1E293B;font-weight:600;font-family:'Poppins',sans-serif}
.gfx-ci-qty button:hover{border-color:#E53E3E;color:#E53E3E}
.gfx-ci-qty span{font-size:14px;font-weight:600;min-width:20px;text-align:center}
.gfx-ci-rm{background:none;border:none;color:#94A3B8;font-size:11px;cursor:pointer;padding:2px 0;margin-top:4px;font-family:'Poppins',sans-serif}
.gfx-ci-rm:hover{color:#E53E3E;text-decoration:underline}
.gfx-foot{border-top:2px solid #E2E8F0;padding:20px 24px}
.gfx-total{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.gfx-total span:first-child{font-size:14px;color:#64748B}
.gfx-total span:last-child{font-size:22px;font-weight:700}
.gfx-checkout{width:100%;padding:16px;border:none;border-radius:10px;background:#E53E3E;color:#fff;font-size:16px;font-weight:700;font-family:'Poppins',sans-serif;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px}
.gfx-checkout:hover{background:#DC2626;transform:translateY(-1px);box-shadow:0 6px 20px rgba(229,62,62,.3)}
.gfx-checkout:disabled{opacity:.6;cursor:not-allowed;transform:none;box-shadow:none}
.gfx-secure{text-align:center;margin-top:10px;font-size:11px;color:#94A3B8;display:flex;align-items:center;justify-content:center;gap:4px}
.gfx-toast{position:fixed;top:20px;right:20px;background:#10B981;color:#fff;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;font-family:'Poppins',sans-serif;z-index:10000;opacity:0;transform:translateY(-10px);transition:all .3s;pointer-events:none;box-shadow:0 4px 12px rgba(16,185,129,.3)}
.gfx-toast.show{opacity:1;transform:translateY(0)}
@keyframes gfx-spin{to{transform:rotate(360deg)}}
`;
        document.head.appendChild(style);

        // Overlay
        const overlay = document.createElement('div');
        overlay.id = 'gfx-overlay';
        overlay.onclick = closeCart;
        document.body.appendChild(overlay);

        // Sidebar
        const sidebar = document.createElement('div');
        sidebar.id = 'gfx-sidebar';
        sidebar.innerHTML = `
            <div class="gfx-hdr"><h3>Your Cart</h3><button class="gfx-close" onclick="GFXCart.close()">&times;</button></div>
            <div class="gfx-items" id="gfx-items"></div>
            <div class="gfx-foot" id="gfx-foot"></div>
        `;
        document.body.appendChild(sidebar);

        // Toast
        const toast = document.createElement('div');
        toast.className = 'gfx-toast';
        toast.id = 'gfx-toast';
        toast.textContent = '\u2713 Added to cart!';
        document.body.appendChild(toast);
    }

    function renderCart() {
        const itemsEl = document.getElementById('gfx-items');
        const footEl = document.getElementById('gfx-foot');

        if (!cart.length) {
            itemsEl.innerHTML = `<div class="gfx-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                <p>Your cart is empty</p></div>`;
            footEl.innerHTML = '';
            return;
        }

        // Escape for safe HTML
        const esc = s => s.replace(/'/g, "\\'").replace(/"/g, '&quot;');

        itemsEl.innerHTML = cart.map(item => {
            const imgTag = item.image ? `<img src="${item.image}" class="gfx-ci-img" alt="${esc(item.name)}" onerror="this.style.display='none'">` : '';
            return `<div class="gfx-ci">
                ${imgTag}
                <div class="gfx-ci-info">
                    <div class="gfx-ci-name">${esc(item.name)}</div>
                    <div class="gfx-ci-price">$${(item.price * item.quantity).toFixed(2)}</div>
                    <div class="gfx-ci-qty">
                        <button onclick="GFXCart.qty('${esc(item.id)}',-1)">&#8722;</button>
                        <span>${item.quantity}</span>
                        <button onclick="GFXCart.qty('${esc(item.id)}',1)">+</button>
                    </div>
                    <button class="gfx-ci-rm" onclick="GFXCart.remove('${esc(item.id)}')">Remove</button>
                </div>
            </div>`;
        }).join('');

        footEl.innerHTML = `
            <div class="gfx-total"><span>Total</span><span>$${getTotal().toFixed(2)}</span></div>
            <button class="gfx-checkout" id="gfx-co-btn" onclick="GFXCart.checkout()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                Secure Checkout
            </button>
            <div class="gfx-secure">&#128274; Powered by Stripe &bull; 256-bit encrypted</div>
        `;
    }

    function openCart() {
        document.getElementById('gfx-overlay').classList.add('open');
        document.getElementById('gfx-sidebar').classList.add('open');
        document.body.style.overflow = 'hidden';
        renderCart();
    }

    function closeCart() {
        document.getElementById('gfx-overlay').classList.remove('open');
        document.getElementById('gfx-sidebar').classList.remove('open');
        document.body.style.overflow = '';
    }

    function showToast() {
        const t = document.getElementById('gfx-toast');
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2000);
    }

    // --- Stripe Checkout ---
    async function checkout() {
        if (!cart.length) return;

        const btn = document.getElementById('gfx-co-btn');
        btn.disabled = true;
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" style="animation:gfx-spin 1s linear infinite"><circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="15"/></svg> Redirecting to Stripe...';

        try {
            const origin = window.location.origin;
            const resp = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart.map(item => ({
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        description: item.description || '',
                        image: item.image ? new URL(item.image, origin).href : ''
                    })),
                    successUrl: origin + '/success.html?session_id={CHECKOUT_SESSION_ID}',
                    cancelUrl: window.location.href
                })
            });

            const data = await resp.json();

            if (data.url) {
                localStorage.setItem(CART_KEY, '[]');
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Checkout failed');
            }
        } catch(e) {
            btn.disabled = false;
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Secure Checkout';
            alert('Checkout error: ' + e.message + '\n\nPlease try again or contact support.');
        }
    }

    // --- Init ---
    function init() {
        loadCart();
        injectUI();

        // Intercept Snipcart add-to-cart buttons
        document.querySelectorAll('.snipcart-add-item').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                addItem(
                    this.getAttribute('data-item-id'),
                    this.getAttribute('data-item-name'),
                    this.getAttribute('data-item-price'),
                    this.getAttribute('data-item-image'),
                    this.getAttribute('data-item-description')
                );
            });
        });

        // Intercept Snipcart cart open buttons
        document.querySelectorAll('.snipcart-checkout').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openCart();
            });
        });

        updateCount();
    }

    // Public API
    window.GFXCart = {
        open: openCart,
        close: closeCart,
        remove: removeItem,
        qty: updateQty,
        checkout: checkout
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
