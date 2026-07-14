// Redesign checkpoint screenshotter (device-free visual verification).
// Serves the `dist/` web export on a local port, then drives headless Chrome to screenshot
// one or more routes at a given viewport. Reusable across the UIUX-Redesign task loop.
//
// Usage:
//   node scripts/shoot.mjs <outDir> <route:w x h> [<route:wxh> ...]
// Example:
//   node scripts/shoot.mjs ../docs/checkpoints/redesign dev/theme:780x844 index:390x844
//
// Each spec is `route:WIDTHxHEIGHT`; the PNG is written as <outDir>/<route-with-dashes>.png.
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');
const CHROME =
  process.env.CHROME_BIN ||
  'C:/Program Files/Google/Chrome/Application/chrome.exe';

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('usage: node scripts/shoot.mjs <outDir> <route:WxH> [<route:WxH> ...]');
  process.exit(1);
}
const outDir = path.resolve(process.cwd(), args[0]);
const specs = args.slice(1).map((s) => {
  const [route, dim] = s.split(':');
  const [w, h] = (dim || '390x844').split('x').map(Number);
  return { route, w, h };
});

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      try {
        let rel = decodeURIComponent(req.url.split('?')[0]);
        if (rel === '/') rel = '/index.html';
        let file = path.join(DIST, rel);
        if (!existsSync(file) && existsSync(file + '.html')) file += '.html';
        if (!existsSync(file)) {
          res.statusCode = 404;
          res.end('not found');
          return;
        }
        const body = await readFile(file);
        res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
        res.end(body);
      } catch (e) {
        res.statusCode = 500;
        res.end(String(e));
      }
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function shoot(url, out, w, h) {
  return new Promise((resolve, reject) => {
    const p = spawn(CHROME, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=2',
      '--default-background-color=00000000',
      `--window-size=${w},${h}`,
      `--screenshot=${out}`,
      '--virtual-time-budget=6000',
      url,
    ]);
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => {
      // Chrome headless returns non-zero sometimes even on success; check the file.
      if (existsSync(out)) resolve();
      else reject(new Error(`chrome failed (${code}): ${err.slice(-400)}`));
    });
  });
}

const server = await serve();
const { port } = server.address();
await mkdir(outDir, { recursive: true });
try {
  for (const { route, w, h } of specs) {
    const out = path.join(outDir, route.replace(/\//g, '-') + '.png');
    const url = `http://127.0.0.1:${port}/${route}`;
    await shoot(url, out, w, h);
    console.log(`shot ${route} @ ${w}x${h} -> ${out}`);
  }
} finally {
  server.close();
}
