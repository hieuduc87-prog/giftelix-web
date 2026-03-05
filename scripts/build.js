const fs = require('fs');
const path = require('path');

const SRC = process.cwd();
const DIST = path.join(SRC, 'dist');
const API_KEY = process.env.SNIPCART_API_KEY || 'YOUR_SNIPCART_PUBLIC_API_KEY';

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

function replaceInHtml(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            replaceInHtml(p);
        } else if (entry.name.endsWith('.html')) {
            let content = fs.readFileSync(p, 'utf8');
            content = content.replace(/YOUR_SNIPCART_PUBLIC_API_KEY/g, API_KEY);
            fs.writeFileSync(p, content);
        }
    }
}

console.log('Building GIFTELIX...');
console.log(`API Key: ${API_KEY === 'YOUR_SNIPCART_PUBLIC_API_KEY' ? '(placeholder - set SNIPCART_API_KEY env var)' : '***configured***'}`);

if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
copyDir(SRC, DIST);
replaceInHtml(DIST);

const htmlCount = [];
(function count(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) count(p);
        else if (e.name.endsWith('.html')) htmlCount.push(p);
    }
})(DIST);

console.log(`Done! ${htmlCount.length} HTML files processed.`);
