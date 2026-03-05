#!/usr/bin/env python3
"""
Build script for GIFTELIX website.
- Copies all product mockup images (all angles)
- Generates individual product pages with image galleries
- Updates index.html: removes Amazon refs, adds collection banners
"""
import os, re, shutil, subprocess, json, glob

PROJECT = "/Users/duchieu/giftelix-web"
SRC_MAGNET = "/Users/duchieu/Desktop/gifttelix/Mockup magnet"
SRC_SUNCATCHER = "/Users/duchieu/Desktop/gifttelix/mock up suncatcher"
SRC_ORNAMENT = "/Users/duchieu/Desktop/gifttelix/MOCKUP nament"

# Product data extracted from current site
PRODUCTS = [
    {"id":"GFX-001","cat":"magnet dad","img":"04032503","pcat":"Magnetic Frame","title":"Our First Father's Day Together","price":"12.99","badge":"badge-best","badge_text":"Best Seller"},
    {"id":"GFX-002","cat":"magnet mom","img":"20062503","pcat":"Magnetic Frame","title":"Best Mom Ever - Birthday Gift for Mom","price":"12.99","badge":"badge-hot","badge_text":"Popular"},
    {"id":"GFX-003","cat":"magnet","img":"26062501","pcat":"Magnetic Frame","title":"It Takes a Village - Thank You Gift","price":"12.99"},
    {"id":"GFX-004","cat":"magnet pet","img":"28022505","pcat":"Magnetic Frame","title":"I'll Be Watching You - Funny Pet Gift","price":"12.99","badge":"badge-hot","badge_text":"Popular"},
    {"id":"GFX-005","cat":"magnet","img":"27062504","pcat":"Magnetic Frame","title":"To My Love - Penguin Soulmates Forever","price":"12.99"},
    {"id":"GFX-006","cat":"magnet","img":"25062503","pcat":"Magnetic Frame","title":"My Sister Forever - Never Apart","price":"12.99"},
    {"id":"GFX-007","cat":"magnet","img":"05032501","pcat":"Magnetic Frame","title":"Hi Grandma & Grandpa - Pregnancy Announcement","price":"12.99"},
    {"id":"GFX-008","cat":"magnet dad","img":"04032505","pcat":"Magnetic Frame","title":"Dear Dad, You're Awesome - Reminder","price":"12.99"},
    {"id":"GFX-009","cat":"magnet dad","img":"24062503","pcat":"Magnetic Frame","title":"Daddy - To Us You Are The World","price":"12.99"},
    {"id":"GFX-010","cat":"magnet dad","img":"18062501","pcat":"Magnetic Frame","title":"Daddy I Can't Wait to Meet You","price":"12.99"},
    {"id":"GFX-011","cat":"magnet pet dad","img":"17062502","pcat":"Magnetic Frame","title":"Best GrandPAW Ever - Dog Grandpa Gift","price":"12.99"},
    {"id":"GFX-012","cat":"magnet mom","img":"26022508","pcat":"Magnetic Frame","title":"Everything I Am, You Helped Me to Be","price":"12.99"},
    {"id":"GFX-013","cat":"magnet","img":"23062502","pcat":"Magnetic Frame","title":"Friends Are Always Close At Heart","price":"12.99"},
    {"id":"GFX-014","cat":"magnet mom","img":"18062506","pcat":"Magnetic Frame","title":"Mom - If You Were A Flower, I'd Pick You","price":"12.99"},
    {"id":"GFX-015","cat":"magnet dad","img":"04032501","pcat":"Magnetic Frame","title":"Being a Dad is an Honor, Papa is Priceless","price":"12.99"},
    {"id":"GFX-016","cat":"magnet mom","img":"26022503","pcat":"Magnetic Frame","title":"Mom - You Are The Piece That Holds Us Together","price":"12.99"},
    {"id":"GFX-017","cat":"magnet pet","img":"16062501","pcat":"Magnetic Frame","title":"Woof - Dog Lover Photo Frame","price":"12.99"},
    {"id":"GFX-018","cat":"magnet pet","img":"21062501","pcat":"Magnetic Frame","title":"Personal Stalker - Funny Dog Gift","price":"12.99"},
    {"id":"GFX-019","cat":"magnet","img":"03032502","pcat":"Magnetic Frame","title":"Life Is Just Better With Grandkids","price":"12.99"},
    {"id":"GFX-020","cat":"magnet memorial","img":"26022504","pcat":"Magnetic Frame","title":"Your Wings Were Ready, Our Hearts Were Not","price":"12.99"},
    {"id":"GFX-021","cat":"magnet pet dad","img":"24062501","pcat":"Magnetic Frame","title":"Best Dog Dad Ever - I Love You Daddy","price":"12.99"},
    {"id":"GFX-022","cat":"magnet","img":"05032506","pcat":"Magnetic Frame","title":"Family - Where Life Begins & Love Never Ends","price":"12.99"},
    {"id":"GFX-023","cat":"magnet mom","img":"18062505","pcat":"Magnetic Frame","title":"My Greatest Gifts Call Me Nana","price":"12.99"},
    {"id":"GFX-024","cat":"magnet","img":"25062505","pcat":"Magnetic Frame","title":"Congrats on Being My Sister - Funny Gift","price":"12.99"},
    {"id":"GFX-025","cat":"suncatcher mom","img":"18032501","pcat":"Crystal Suncatcher","title":"You Are My Sunshine - Sunflower Suncatcher","price":"16.99","badge":"badge-best","badge_text":"Best Seller"},
    {"id":"GFX-026","cat":"suncatcher pet memorial","img":"01082504","pcat":"Crystal Suncatcher","title":"Once by My Side, Forever in My Heart - Pet Memorial","price":"16.99","badge":"badge-best","badge_text":"Best Seller"},
    {"id":"GFX-027","cat":"suncatcher memorial","img":"07082509","pcat":"Crystal Suncatcher","title":"Those We Love Don't Go Away - Memorial Angel","price":"16.99"},
    {"id":"GFX-028","cat":"suncatcher mom","img":"18032502","pcat":"Crystal Suncatcher","title":"Grandma's Garden - Heart Suncatcher","price":"16.99"},
    {"id":"GFX-029","cat":"suncatcher memorial","img":"06082504","pcat":"Crystal Suncatcher","title":"Look For Me In The Sunshine - Memorial Gift","price":"16.99"},
    {"id":"GFX-030","cat":"suncatcher","img":"01082507","pcat":"Crystal Suncatcher","title":"Thank You For Being In My Circle - Friendship","price":"16.99"},
    {"id":"GFX-031","cat":"suncatcher memorial","img":"17032503","pcat":"Crystal Suncatcher","title":"Look For Me In Rainbows - Rainbow Arch Memorial","price":"16.99"},
    {"id":"GFX-032","cat":"suncatcher memorial","img":"11082502","pcat":"Crystal Suncatcher","title":"The Sky Looks Different When You Have Someone Up There","price":"16.99"},
    {"id":"GFX-033","cat":"suncatcher","img":"07082504","pcat":"Crystal Suncatcher","title":"Guardian Angels - Protect & Guide","price":"16.99"},
    {"id":"GFX-034","cat":"suncatcher pet memorial","img":"01082511","pcat":"Crystal Suncatcher","title":"Cat Angel on Moon - Pet Memorial Suncatcher","price":"16.99"},
    {"id":"GFX-035","cat":"suncatcher mom memorial","img":"17032513","pcat":"Crystal Suncatcher","title":"Mom - Your Memories Are The Light That Leads My Way","price":"16.99"},
    {"id":"GFX-036","cat":"suncatcher","img":"17032508","pcat":"Crystal Suncatcher","title":"Hummingbird - Stained Glass Crystal Suncatcher","price":"16.99"},
    {"id":"GFX-037","cat":"suncatcher pet memorial","img":"07082505","pcat":"Crystal Suncatcher","title":"Look For Me In The Rainbows - Cat Memorial Paw","price":"16.99"},
    {"id":"GFX-038","cat":"suncatcher","img":"11082501","pcat":"Crystal Suncatcher","title":"Tree of Life - Stained Glass Crystal Suncatcher","price":"16.99"},
    {"id":"GFX-039","cat":"suncatcher memorial","img":"19032512","pcat":"Crystal Suncatcher","title":"Red Cardinal - Memorial Crystal Suncatcher","price":"16.99"},
    {"id":"GFX-040","cat":"suncatcher pet memorial","img":"17032512","pcat":"Crystal Suncatcher","title":"Dog Angel on Moon - Pet Memorial Suncatcher","price":"16.99"},
    {"id":"GFX-041","cat":"ornament","img":"047202503","pcat":"Glass Ornament","title":"Hummingbird - Stained Glass Crystal Ornament","price":"14.99","badge":"badge-best","badge_text":"Best Seller"},
    {"id":"GFX-042","cat":"ornament","img":"047202504","pcat":"Glass Ornament","title":"Blue Morpho Butterfly - Stained Glass Ornament","price":"14.99"},
    {"id":"GFX-043","cat":"ornament","img":"04072506","pcat":"Glass Ornament","title":"Dragonfly Garden - Stained Glass Crystal Ornament","price":"14.99"},
    {"id":"GFX-044","cat":"ornament memorial","img":"05072506","pcat":"Glass Ornament","title":"Red Cardinals & Cherry Blossoms - Crystal Ornament","price":"14.99"},
    {"id":"GFX-045","cat":"ornament","img":"05072507","pcat":"Glass Ornament","title":"Rainbow Tree of Life - Crystal Ornament","price":"14.99"},
    {"id":"GFX-046","cat":"ornament","img":"05072503","pcat":"Glass Ornament","title":"Coastal Lighthouse - Stained Glass Ornament","price":"14.99"},
    {"id":"GFX-047","cat":"ornament","img":"047202501","pcat":"Glass Ornament","title":"Majestic Dragon - Stained Glass Crystal Ornament","price":"14.99"},
    {"id":"GFX-048","cat":"ornament","img":"047202502","pcat":"Glass Ornament","title":"Christmas Bells & Holly - Crystal Ornament","price":"14.99"},
    {"id":"GFX-049","cat":"ornament","img":"05072501","pcat":"Glass Ornament","title":"Rainbow Mountain Sunrise - Crystal Ornament","price":"14.99"},
    {"id":"GFX-050","cat":"ornament","img":"05072502","pcat":"Glass Ornament","title":"Angel with Butterfly Wings - Crystal Ornament","price":"14.99"},
    {"id":"GFX-051","cat":"ornament","img":"04072508","pcat":"Glass Ornament","title":"Coffee Gnome - Cute Crystal Ornament","price":"14.99"},
    {"id":"GFX-052","cat":"ornament","img":"05072505","pcat":"Glass Ornament","title":"Lily of the Valley - Stained Glass Ornament","price":"14.99"},
]

def find_source_folder(folder_id, base_path):
    """Find folder even with trailing spaces"""
    for d in os.listdir(base_path):
        if d.strip() == folder_id:
            return os.path.join(base_path, d)
    return None

def get_gallery_images(product):
    """Get all mockup images for a product"""
    img_id = product["img"]
    images = []

    if "magnet" in product["cat"]:
        src = os.path.join(SRC_MAGNET, f"{img_id}.jpg")
        if os.path.exists(src):
            images.append(("main", src))
    elif "suncatcher" in product["cat"]:
        folder = find_source_folder(img_id, SRC_SUNCATCHER)
        if folder:
            # Main image
            main = os.path.join(folder, f"{img_id}.jpg")
            if os.path.exists(main):
                images.append(("main", main))
            # Try MK naming
            for mk in ["MK1.jpg", "MK2.jpg", "MK3.jpg", "MK4.jpg", "MK5.jpg"]:
                p = os.path.join(folder, mk)
                if os.path.exists(p):
                    images.append((mk, p))
            # Numbered images
            for i in range(1, 10):
                p = os.path.join(folder, f"{i}.jpg")
                if os.path.exists(p):
                    images.append((f"{i}", p))
    elif "ornament" in product["cat"]:
        folder = find_source_folder(img_id, SRC_ORNAMENT)
        if folder:
            # MKC main
            mkc = os.path.join(folder, "MKC.jpg")
            if os.path.exists(mkc):
                images.append(("main", mkc))
            # Named main
            main = os.path.join(folder, f"{img_id}.jpg")
            if os.path.exists(main):
                images.append(("main2", main))
            # Numbered
            for i in range(1, 10):
                p = os.path.join(folder, f"{i}.jpg")
                if os.path.exists(p):
                    images.append((f"{i}", p))
    return images

def copy_and_resize(src, dst, size=800):
    """Copy and resize image"""
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    try:
        subprocess.run(["sips", "-Z", str(size), dst], capture_output=True)
    except:
        pass

def setup_images():
    """Copy all product images organized by product"""
    print("Copying product images...")
    for p in PRODUCTS:
        img_id = p["img"]
        gallery = get_gallery_images(p)

        if "magnet" in p["cat"]:
            cat_dir = "magnets"
        elif "suncatcher" in p["cat"]:
            cat_dir = "suncatchers"
        else:
            cat_dir = "ornaments"

        # Create gallery folder
        gallery_dir = os.path.join(PROJECT, "images", cat_dir, img_id)
        os.makedirs(gallery_dir, exist_ok=True)

        img_files = []
        for idx, (name, src) in enumerate(gallery):
            dst = os.path.join(gallery_dir, f"{idx+1}.jpg")
            copy_and_resize(src, dst)
            img_files.append(f"images/{cat_dir}/{img_id}/{idx+1}.jpg")

        p["gallery"] = img_files
        # Main image (first in gallery or existing)
        if img_files:
            p["main_img"] = img_files[0]
        else:
            # Fallback to existing
            p["main_img"] = f"images/{cat_dir}/{img_id}.jpg"
            p["gallery"] = [p["main_img"]]

        print(f"  {p['id']}: {len(img_files)} images")

def generate_product_page(p):
    """Generate individual product page HTML"""
    gallery_html = ""
    thumbs_html = ""
    for i, img in enumerate(p["gallery"]):
        active = "active" if i == 0 else ""
        gallery_html += f'        <img src="../{img}" class="gallery-img {active}" data-idx="{i}" alt="{p["title"]}" loading="lazy">\n'
        thumbs_html += f'        <img src="../{img}" class="thumb {active}" onclick="showImg({i})" alt="View {i+1}">\n'

    num_imgs = len(p["gallery"])

    # Find related products (same category, different product)
    cat_main = p["cat"].split()[0]
    related = [r for r in PRODUCTS if cat_main in r["cat"] and r["id"] != p["id"]][:4]
    related_html = ""
    for r in related:
        related_html += f'''        <a href="{r['id'].lower()}.html" class="related-card">
            <img src="../{r['main_img']}" alt="{r['title']}" loading="lazy">
            <div class="related-title">{r['title']}</div>
            <div class="related-price">${r['price']}</div>
        </a>
'''

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{p["title"]} - GIFTELIX {p["pcat"]}</title>
    <meta name="description" content="{p["pcat"]} - {p["title"]}. Premium handcrafted gift from GIFTELIX. ${p["price"]}">
    <link rel="stylesheet" href="https://cdn.snipcart.com/themes/v3.7.1/default/snipcart.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {{--primary:#E53E3E;--primary-dark:#C53030;--dark:#1A202C;--gray-900:#171923;--gray-700:#4A5568;--gray-600:#718096;--gray-500:#A0AEC0;--gray-400:#CBD5E0;--gray-300:#E2E8F0;--gray-200:#EDF2F7;--gray-100:#F7FAFC;--white:#FFFFFF;--radius:12px}}
        *{{margin:0;padding:0;box-sizing:border-box}}
        body{{font-family:'Poppins',sans-serif;color:var(--dark);background:var(--white);-webkit-font-smoothing:antialiased}}
        a{{text-decoration:none;color:inherit}}
        img{{max-width:100%;display:block}}
        header{{background:var(--white);border-bottom:1px solid var(--gray-200);padding:12px 24px;display:flex;align-items:center;justify-content:space-between;max-width:1280px;margin:0 auto;position:sticky;top:0;z-index:100;background:var(--white)}}
        .logo{{font-size:24px;font-weight:700;letter-spacing:2px}}.logo b{{color:var(--primary)}}
        .header-actions{{display:flex;gap:12px;align-items:center}}
        .back-btn{{font-size:13px;font-weight:500;color:var(--gray-700);display:flex;align-items:center;gap:4px;transition:color .2s}}
        .back-btn:hover{{color:var(--primary)}}
        .cart-btn{{display:flex;align-items:center;gap:6px;background:none;border:1px solid var(--gray-300);padding:8px 16px;border-radius:8px;cursor:pointer;font-family:'Poppins',sans-serif;font-size:13px;font-weight:500;color:var(--dark);transition:all .2s}}
        .cart-btn:hover{{border-color:var(--primary);color:var(--primary)}}
        .cart-btn svg{{width:18px;height:18px}}
        .cart-count{{background:var(--primary);color:var(--white);font-size:10px;font-weight:700;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center}}

        .product-container{{max-width:1200px;margin:0 auto;padding:40px 24px;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start}}

        .gallery{{position:sticky;top:80px}}
        .gallery-main{{aspect-ratio:1;border-radius:var(--radius);overflow:hidden;background:var(--gray-100);margin-bottom:12px;position:relative}}
        .gallery-img{{width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;opacity:0;transition:opacity .3s}}
        .gallery-img.active{{opacity:1;position:relative}}
        .gallery-nav{{position:absolute;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.9);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;z-index:2;transition:all .2s;box-shadow:0 2px 8px rgba(0,0,0,.1)}}
        .gallery-nav:hover{{background:var(--white);box-shadow:0 4px 12px rgba(0,0,0,.15)}}
        .gallery-prev{{left:10px}}
        .gallery-next{{right:10px}}
        .thumbs{{display:flex;gap:8px;overflow-x:auto;padding:4px 0}}
        .thumb{{width:72px;height:72px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid transparent;opacity:.6;transition:all .2s;flex-shrink:0}}
        .thumb.active{{border-color:var(--primary);opacity:1}}
        .thumb:hover{{opacity:1}}
        .img-counter{{position:absolute;bottom:12px;right:12px;background:rgba(0,0,0,.6);color:white;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:500}}

        .product-info{{padding:8px 0}}
        .breadcrumb{{font-size:12px;color:var(--gray-600);margin-bottom:16px}}
        .breadcrumb a{{color:var(--gray-600);transition:color .2s}}
        .breadcrumb a:hover{{color:var(--primary)}}
        .product-cat{{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:var(--primary);margin-bottom:8px}}
        .product-title{{font-size:28px;font-weight:700;line-height:1.3;margin-bottom:12px}}
        .product-rating{{display:flex;align-items:center;gap:8px;margin-bottom:20px}}
        .stars{{color:#F59E0B;font-size:16px;letter-spacing:2px}}
        .rating-text{{font-size:14px;color:var(--gray-600)}}
        .product-price{{font-size:32px;font-weight:700;margin-bottom:24px}}
        .product-price .currency{{font-size:18px;vertical-align:super}}

        .add-to-cart{{width:100%;padding:16px 32px;border:none;border-radius:var(--radius);background:var(--primary);color:var(--white);font-size:16px;font-weight:600;font-family:'Poppins',sans-serif;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px}}
        .add-to-cart:hover{{background:var(--primary-dark);transform:translateY(-2px);box-shadow:0 8px 20px rgba(229,62,62,.3)}}
        .add-to-cart svg{{width:20px;height:20px}}

        .product-features{{margin-top:28px;padding-top:28px;border-top:1px solid var(--gray-300)}}
        .product-features h3{{font-size:16px;font-weight:600;margin-bottom:16px}}
        .feature-list{{list-style:none;display:flex;flex-direction:column;gap:10px}}
        .feature-list li{{font-size:14px;color:var(--gray-700);display:flex;align-items:center;gap:8px;line-height:1.5}}
        .feature-list li::before{{content:"\\2713";color:var(--primary);font-weight:700;font-size:14px}}

        .trust-badges{{display:flex;gap:20px;margin-top:24px;flex-wrap:wrap}}
        .trust-badge{{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500;color:var(--gray-600)}}

        .product-desc{{margin-top:28px;padding-top:28px;border-top:1px solid var(--gray-300)}}
        .product-desc h3{{font-size:16px;font-weight:600;margin-bottom:12px}}
        .product-desc p{{font-size:14px;color:var(--gray-700);line-height:1.8}}

        .related-section{{max-width:1200px;margin:0 auto;padding:60px 24px 80px}}
        .related-section h2{{font-size:24px;font-weight:700;margin-bottom:24px}}
        .related-grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}}
        .related-card{{border:1px solid var(--gray-300);border-radius:var(--radius);overflow:hidden;transition:all .3s;display:block}}
        .related-card:hover{{box-shadow:0 8px 24px rgba(0,0,0,.1);transform:translateY(-4px)}}
        .related-card img{{aspect-ratio:1;object-fit:cover;width:100%}}
        .related-title{{padding:10px 12px 4px;font-size:13px;font-weight:500;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}}
        .related-price{{padding:0 12px 12px;font-size:15px;font-weight:700}}

        footer{{background:var(--gray-900);color:var(--gray-500);padding:24px;text-align:center;font-size:13px}}
        footer a{{color:var(--gray-500)}}

        @media(max-width:768px){{
            .product-container{{grid-template-columns:1fr;gap:24px}}
            .gallery{{position:static}}
            .product-title{{font-size:22px}}
            .product-price{{font-size:26px}}
            .related-grid{{grid-template-columns:repeat(2,1fr)}}
        }}
    </style>
</head>
<body>
<header>
    <a href="../index.html" class="logo">GIFTEL<b>IX</b></a>
    <div class="header-actions">
        <a href="../index.html#products" class="back-btn">&#8592; Back to Shop</a>
        <button class="snipcart-checkout cart-btn" title="Shopping Cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span class="snipcart-items-count cart-count">0</span>
        </button>
    </div>
</header>

<div class="product-container">
    <div class="gallery">
        <div class="gallery-main" id="galleryMain">
{gallery_html}            <button class="gallery-nav gallery-prev" onclick="navImg(-1)">&#10094;</button>
            <button class="gallery-nav gallery-next" onclick="navImg(1)">&#10095;</button>
            <div class="img-counter"><span id="imgIdx">1</span> / {num_imgs}</div>
        </div>
        <div class="thumbs" id="thumbs">
{thumbs_html}        </div>
    </div>

    <div class="product-info">
        <div class="breadcrumb"><a href="../index.html">Home</a> / <a href="../index.html#products">{p["pcat"]}s</a> / {p["title"]}</div>
        <div class="product-cat">{p["pcat"]}</div>
        <h1 class="product-title">{p["title"]}</h1>
        <div class="product-rating">
            <span class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <span class="rating-text">5.0 &bull; Verified Reviews</span>
        </div>
        <div class="product-price"><span class="currency">$</span>{p["price"]}</div>

        <button class="snipcart-add-item add-to-cart"
            data-item-id="{p["id"]}"
            data-item-name="{p["title"]}"
            data-item-price="{p["price"]}"
            data-item-url="/products/{p["id"].lower()}.html"
            data-item-image="../{p["main_img"]}"
            data-item-description="{p["pcat"]} - {p["title"]}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Add to Cart
        </button>

        <div class="trust-badges">
            <div class="trust-badge">&#128274; Secure Checkout</div>
            <div class="trust-badge">&#128666; Fast Shipping</div>
            <div class="trust-badge">&#127873; Gift-Ready</div>
            <div class="trust-badge">&#128260; Easy Returns</div>
        </div>

        <div class="product-features">
            <h3>Product Highlights</h3>
            <ul class="feature-list">
                {get_features_html(p)}
            </ul>
        </div>

        <div class="product-desc">
            <h3>Description</h3>
            <p>{get_description(p)}</p>
        </div>
    </div>
</div>

<div class="related-section">
    <h2>You May Also Like</h2>
    <div class="related-grid">
{related_html}    </div>
</div>

<footer>
    &copy; 2025 GIFTELIX LLC. All rights reserved. &bull; <a href="../privacy.html">Privacy</a> &bull; <a href="../terms.html">Terms</a> &bull; <a href="mailto:admin@giftelix.com">Contact</a>
</footer>

<div hidden id="snipcart" data-api-key="YOUR_SNIPCART_PUBLIC_API_KEY" data-currency="usd" data-config-modal-style="side"></div>
<script async src="https://cdn.snipcart.com/themes/v3.7.1/default/snipcart.js"></script>
<script>
let curImg=0,totalImgs={num_imgs};
function showImg(n){{
    curImg=n;
    document.querySelectorAll('.gallery-img').forEach((img,i)=>{{img.classList.toggle('active',i===n)}});
    document.querySelectorAll('.thumb').forEach((t,i)=>{{t.classList.toggle('active',i===n)}});
    document.getElementById('imgIdx').textContent=n+1;
}}
function navImg(dir){{showImg((curImg+dir+totalImgs)%totalImgs)}}
</script>
</body>
</html>'''
    return html

def get_features_html(p):
    if "magnet" in p["cat"]:
        return """<li>Strong magnetic backing - sticks to any metal surface</li>
                <li>Holds standard 4x6 or 5x7 photos securely</li>
                <li>Fade-resistant UV printing for lasting color</li>
                <li>Perfect for refrigerator, locker, or any magnetic surface</li>
                <li>Comes in beautiful gift-ready packaging</li>"""
    elif "suncatcher" in p["cat"]:
        return """<li>Premium faceted crystal prism creates stunning rainbows</li>
                <li>UV-printed stained glass art on high-grade aluminum</li>
                <li>Includes suction cup for easy window mounting</li>
                <li>Creates beautiful light patterns when sun hits</li>
                <li>Elegant gift packaging included</li>"""
    else:
        return """<li>Crystal-clear glass with vivid stained glass printing</li>
                <li>Ornate silver-tone metal cap and hanging ribbon</li>
                <li>Catches and refracts light beautifully</li>
                <li>Perfect for Christmas tree, window, or year-round display</li>
                <li>Gift-ready packaging with protective cushioning</li>"""

def get_description(p):
    title = p["title"]
    pcat = p["pcat"]
    if "magnet" in p["cat"]:
        return f"The {title} magnetic photo frame from GIFTELIX is the perfect way to display your cherished memories. Featuring a strong magnetic backing, this frame holds your favorite photos securely on any metal surface. The heartwarming message is UV-printed for fade-resistant, long-lasting beauty. Makes a thoughtful gift for any occasion."
    elif "suncatcher" in p["cat"]:
        return f"Bring light and love into any space with the {title} crystal suncatcher by GIFTELIX. Each piece features a stunning stained glass art print on premium aluminum, paired with a faceted crystal prism that casts beautiful rainbows when sunlight passes through. Hang it in a window and watch as it transforms ordinary light into a magical display of color."
    else:
        return f"The {title} by GIFTELIX is a stunning glass ornament featuring vivid stained glass artistry. The crystal-clear glass catches and refracts light beautifully, creating a mesmerizing display. Topped with an ornate silver-tone cap and hanging ribbon, it's perfect for holiday decorating or year-round display. Each ornament arrives in protective gift-ready packaging."

def generate_index():
    """Generate updated index.html"""
    print("Generating updated index.html...")

    # Read current file
    with open(os.path.join(PROJECT, "index.html"), "r") as f:
        html = f.read()

    # 1. Remove Amazon header top
    html = html.replace(
        'Free Shipping with Amazon Prime &bull; <span>&#9733; Thousands of 5-Star Reviews</span>',
        'Free Shipping on Orders $50+ &bull; <span>&#9733; Thousands of 5-Star Reviews</span>'
    )

    # 2. Remove "Also on Amazon" nav link
    html = re.sub(r'\s*<li><a href="https://www\.amazon\.com[^"]*"[^>]*class="nav-shop"[^>]*>Also on Amazon</a></li>', '', html)

    # 3. Remove all "Also available on Amazon" buttons
    html = re.sub(r'\s*<a href="https://www\.amazon\.com[^"]*"[^>]*class="product-btn btn-amazon"[^>]*>Also available on Amazon</a>', '', html)

    # 4. Update meta description
    html = html.replace(
        'Shop on Amazon.',
        'Shop now at giftelix.com.'
    )

    # 5. Update collection cards to use banner images
    html = html.replace(
        """<a href="#products" onclick="setTimeout(()=>filterProducts('suncatcher'),100)" class="collection-card fade-in">
            <div class="col-img" style="background-image:url('images/suncatchers/18032501.jpg')"></div>
            <div class="collection-count">28+ designs</div>
            <div class="collection-overlay">
                <h3>Crystal Suncatchers</h3>
                <p>Rainbow-making wooden ornaments with crystal prisms</p>
            </div>
        </a>""",
        """<a href="#products" onclick="setTimeout(()=>filterProducts('suncatcher'),100)" class="collection-card fade-in" style="aspect-ratio:auto">
            <img src="images/collections/suncatchers.png" alt="Crystal Suncatchers Collection" style="width:100%;display:block;border-radius:var(--radius)">
        </a>"""
    )
    html = html.replace(
        """<a href="#products" onclick="setTimeout(()=>filterProducts('ornament'),100)" class="collection-card fade-in">
            <div class="col-img" style="background-image:url('images/ornaments/047202503.jpg')"></div>
            <div class="collection-count">40+ designs</div>
            <div class="collection-overlay">
                <h3>Glass Ornaments</h3>
                <p>Stunning stained-glass crystal ornaments</p>
            </div>
        </a>""",
        """<a href="#products" onclick="setTimeout(()=>filterProducts('ornament'),100)" class="collection-card fade-in" style="aspect-ratio:auto">
            <img src="images/collections/ornaments.jpg" alt="Glass Ornaments Collection" style="width:100%;display:block;border-radius:var(--radius)">
        </a>"""
    )
    html = html.replace(
        """<a href="#products" onclick="setTimeout(()=>filterProducts('magnet'),100)" class="collection-card fade-in">
            <div class="col-img" style="background-image:url('images/magnets/04032503.jpg')"></div>
            <div class="collection-count">46+ designs</div>
            <div class="collection-overlay">
                <h3>Magnetic Photo Frames</h3>
                <p>Adorable fridge magnets with loving messages</p>
            </div>
        </a>""",
        """<a href="#products" onclick="setTimeout(()=>filterProducts('magnet'),100)" class="collection-card fade-in" style="aspect-ratio:auto">
            <img src="images/collections/magnets.png" alt="Magnetic Photo Frames Collection" style="width:100%;display:block;border-radius:var(--radius)">
        </a>"""
    )

    # 6. Update "View All" button (remove Amazon link)
    html = re.sub(
        r'<a href="https://www\.amazon\.com/stores/page/[^"]*"[^>]*class="btn btn-primary">View All 100\+ Products on Amazon[^<]*</a>',
        '<button onclick="filterProducts(\'all\')" class="btn btn-primary">View All 100+ Products &rarr;</button>',
        html
    )

    # 7. Update "Amazon Trusted" feature to "Trusted Quality"
    html = html.replace(
        '<div class="feature-card fade-in"><div class="feature-icon">&#128588;</div><h3>Amazon Trusted</h3><p>Prime shipping, easy returns, and thousands of 5-star reviews from happy customers.</p></div>',
        '<div class="feature-card fade-in"><div class="feature-icon">&#128588;</div><h3>Trusted by Thousands</h3><p>Secure checkout, fast shipping, easy returns, and thousands of 5-star reviews from happy customers.</p></div>'
    )

    # 8. Update occasions links (remove Amazon, use JS filter)
    occasion_replacements = [
        ('https://www.amazon.com/s?k=GIFTELIX+mom+mother', '#products" onclick="setTimeout(()=>filterProducts(\'mom\'),100)'),
        ('https://www.amazon.com/s?k=GIFTELIX+dad+father', '#products" onclick="setTimeout(()=>filterProducts(\'dad\'),100)'),
        ('https://www.amazon.com/s?k=GIFTELIX+christmas+ornament', '#products" onclick="setTimeout(()=>filterProducts(\'ornament\'),100)'),
        ('https://www.amazon.com/s?k=GIFTELIX+birthday', '#products" onclick="setTimeout(()=>filterProducts(\'all\'),100)'),
        ('https://www.amazon.com/s?k=GIFTELIX+sympathy+memorial', '#products" onclick="setTimeout(()=>filterProducts(\'memorial\'),100)'),
        ('https://www.amazon.com/s?k=GIFTELIX+pet+memorial', '#products" onclick="setTimeout(()=>filterProducts(\'pet\'),100)'),
        ('https://www.amazon.com/s?k=GIFTELIX+baby+pregnancy', '#products" onclick="setTimeout(()=>filterProducts(\'all\'),100)'),
        ('https://www.amazon.com/s?k=GIFTELIX+valentine+love', '#products" onclick="setTimeout(()=>filterProducts(\'all\'),100)'),
    ]
    for old, new in occasion_replacements:
        html = html.replace(old, new)
    # Remove target="_blank" from occasion links
    html = re.sub(r'(<a href="#products[^"]*")\s*target="_blank"\s*(class="occasion)', r'\1 \2', html)

    # 9. Update CTA banner
    html = html.replace(
        'Browse 100+ designs on Amazon. Free Prime shipping, easy returns, and gifts that arrive ready to give.',
        'Browse 100+ designs. Fast shipping, easy returns, and gifts that arrive ready to give.'
    )
    html = re.sub(
        r'<a href="https://www\.amazon\.com/stores/page/[^"]*"[^>]*>Shop All Products on Amazon[^<]*</a>',
        '<a href="#products" class="btn btn-primary" style="font-size:16px;padding:16px 40px">Shop All Products &rarr;</a>',
        html
    )

    # 10. Update footer collection links
    footer_replacements = [
        ('https://www.amazon.com/s?k=GIFTELIX+suncatcher', '#products'),
        ('https://www.amazon.com/s?k=GIFTELIX+glass+ornament', '#products'),
        ('https://www.amazon.com/s?k=GIFTELIX+magnetic+frame', '#products'),
        ('https://www.amazon.com/s?k=GIFTELIX+pet+memorial', '#products'),
        ('https://www.amazon.com/stores/page/28B41EB9-708A-426B-AB45-95750403EE8A', '#products'),
        ('https://www.amazon.com/s?k=GIFTELIX+mom', '#products'),
        ('https://www.amazon.com/s?k=GIFTELIX+dad', '#products'),
        ('https://www.amazon.com/s?k=GIFTELIX+christmas', '#products'),
        ('https://www.amazon.com/s?k=GIFTELIX+sympathy', '#products'),
        ('https://www.amazon.com/s?k=GIFTELIX+valentine', '#products'),
    ]
    for old, new in footer_replacements:
        html = html.replace(old, new)
    # Remove target="_blank" from footer internal links
    html = re.sub(r'(<a href="#products")\s*target="_blank"', r'\1', html)

    # 11. Remove .btn-amazon CSS
    html = html.replace(
        ".btn-amazon{background:var(--gray-100);color:var(--gray-700);font-size:11px;padding:8px}\n        .btn-amazon:hover{background:var(--gray-200)}",
        ""
    )

    # 12. Wrap each product card image in a link to product page
    # Replace product card <div> to include link to product page
    for p in PRODUCTS:
        # Update main image to link to product page
        old_img_src = f'images/{get_cat_dir(p)}/{p["img"]}.jpg'
        new_img_src = p["main_img"]

        # Replace the product image div to add a link
        old_pattern = f'<div class="product-img"><img src="{old_img_src}"'
        new_pattern = f'<div class="product-img"><a href="products/{p["id"].lower()}.html"><img src="{new_img_src}"'
        html = html.replace(old_pattern, new_pattern)

        # Close the <a> tag after the img and any badge
        # Find the pattern and add closing </a> before </div>
        # This is tricky - let's use regex

    # Add closing </a> tags for product image links
    html = re.sub(
        r'(<div class="product-img"><a href="products/[^"]*">.*?)(</div>)',
        r'\1</a>\2',
        html,
        flags=re.DOTALL
    )

    # Also make product titles clickable
    for p in PRODUCTS:
        old_title = f'<div class="product-title">{p["title"]}</div>'
        new_title = f'<div class="product-title"><a href="products/{p["id"].lower()}.html" style="color:inherit">{p["title"]}</a></div>'
        html = html.replace(old_title, new_title)

    # Update snipcart data-item-url to point to product pages
    for p in PRODUCTS:
        html = html.replace(
            f'data-item-url="/index.html"\n            data-item-image="{get_cat_dir(p)}/{p["img"]}.jpg"' if False else '',
            ''
        )

    with open(os.path.join(PROJECT, "index.html"), "w") as f:
        f.write(html)

    print("  index.html updated")

def get_cat_dir(p):
    if "magnet" in p["cat"]: return "magnets"
    elif "suncatcher" in p["cat"]: return "suncatchers"
    else: return "ornaments"

def main():
    # Step 1: Copy images
    setup_images()

    # Step 2: Generate product pages
    os.makedirs(os.path.join(PROJECT, "products"), exist_ok=True)
    print("\nGenerating product pages...")
    for p in PRODUCTS:
        page = generate_product_page(p)
        fname = os.path.join(PROJECT, "products", f"{p['id'].lower()}.html")
        with open(fname, "w") as f:
            f.write(page)
        print(f"  {p['id'].lower()}.html")

    # Step 3: Update index.html
    generate_index()

    print("\nDone! Generated:")
    print(f"  - {len(PRODUCTS)} product pages in products/")
    print(f"  - Updated index.html (no Amazon refs)")
    print(f"  - Collection banners in images/collections/")

if __name__ == "__main__":
    main()
