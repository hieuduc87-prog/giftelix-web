const fs = require('fs');
const path = require('path');

const SRC = process.cwd();
const DIST = path.join(SRC, 'dist');

const SKIP = new Set(['.git', '.github', '.vercel', 'node_modules', 'dist', 'scripts', 'build.py', '__pycache__', '.gitignore', 'api']);

function copyDir(src, dst) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        if (SKIP.has(entry.name)) continue;
        const s = path.join(src, entry.name);
        const d = path.join(dst, entry.name);
        if (entry.isDirectory()) {
            copyDir(s, d);
        } else {
            fs.copyFileSync(s, d);
        }
    }
}

function processHtml(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            processHtml(p);
        } else if (entry.name.endsWith('.html')) {
            let c = fs.readFileSync(p, 'utf8');

            // Remove Snipcart CSS
            c = c.replace(/<link[^>]*snipcart[^>]*\.css[^>]*\/?\s*>/gi, '');

            // Remove Snipcart hidden div
            c = c.replace(/<div[^>]*id="snipcart"[^>]*><\/div>/gi, '');

            // Remove Snipcart JS
            c = c.replace(/<script[^>]*snipcart[^>]*\.js[^>]*><\/script>/gi, '');

            // Add cart.js before </body>
            if (!c.includes('cart.js')) {
                c = c.replace('</body>', '<script src="/js/cart.js"></script>\n</body>');
            }

            fs.writeFileSync(p, c);
        }
    }
}

console.log('Building GIFTELIX...');

if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
copyDir(SRC, DIST);
processHtml(DIST);

const htmlCount = [];
(function count(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) count(p);
        else if (e.name.endsWith('.html')) htmlCount.push(p);
    }
})(DIST);

console.log(`Done! ${htmlCount.length} HTML files processed. Snipcart replaced with Stripe cart.`);
