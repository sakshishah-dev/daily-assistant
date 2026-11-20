// Fails if anything that looks like a secret ended up in the built app.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../dist/web/browser/', import.meta.url).pathname;
const bad = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|html|json|css|webmanifest)$/.test(name)) scan(p, readFileSync(p, 'utf8'));
  }
};
const scan = (file, text) => {
  if (/sb_secret_[A-Za-z0-9_-]+/.test(text)) bad.push(`${file}: sb_secret_ key`);
  if (/service_role/i.test(text) && !/ngsw/.test(file)) bad.push(`${file}: mentions service_role`);
  for (const jwt of text.match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*/g) ?? []) {
    try {
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());
      if (payload.role && payload.role !== 'anon') bad.push(`${file}: JWT with role ${payload.role}`);
    } catch { /* not a JWT */ }
  }
};
walk(root);
if (bad.length) { console.error('SECRET CHECK FAILED:\n' + bad.join('\n')); process.exit(1); }
console.log('Secret check passed: no secret keys found in the built app.');
