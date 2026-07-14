// Redesign checkpoint screenshotter (device-free visual verification).
// Serves the `dist/` web export locally, then drives headless Chrome over the DevTools Protocol
// with TRUE mobile device emulation (Emulation.setDeviceMetricsOverride) so a 390px spec renders
// at a real 390 CSS-px viewport — Chrome's ~500px headless window floor would otherwise crop a
// wider render and fake a horizontal overflow. Reusable across the UIUX-Redesign task loop.
//
// Usage:
//   node scripts/shoot.mjs <outDir> <route:WxH[=name]> [<route:WxH[=name]> ...]
// Example:
//   node scripts/shoot.mjs ../docs/checkpoints/redesign dev/theme:820x844=r4 index:390x844
//
// Each spec is `route:WIDTHxHEIGHT` with an optional `=name` output-file override. `dev/*` routes
// (the two-panel theme harness) render desktop-wide; everything else emulates a phone (mobile:true).
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '..', 'dist');
const CHROME = process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SCALE = Number(process.env.SHOOT_SCALE || '2');
// Dark-theme captures come from a dark BUILD (`EXPO_PUBLIC_FORCE_SCHEME=dark npx expo export`),
// not from this script — react-native-web can't switch scheme client-side in a static web export.

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

const argv = process.argv.slice(2);
if (argv.length < 2) {
  console.error('usage: node scripts/shoot.mjs <outDir> <route:WxH[=name]> ...');
  process.exit(1);
}
const outDir = path.resolve(process.cwd(), argv[0]);
const specs = argv.slice(1).map((s) => {
  const [route, rest] = s.split(':');
  const [dim, name] = (rest || '390x844').split('=');
  const [w, h] = dim.split('x').map(Number);
  return { route, w, h, name };
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

// Minimal CDP client over the browser-level WebSocket (flatten mode → per-session routing).
function launchChrome() {
  return new Promise((resolve, reject) => {
    const proc = spawn(CHROME, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--remote-debugging-port=0',
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ]);
    let buf = '';
    const onErr = (d) => {
      buf += d;
      const m = buf.match(/ws:\/\/[^\s]+/);
      if (m) {
        proc.stderr.off('data', onErr);
        resolve({ proc, wsUrl: m[0] });
      }
    };
    proc.stderr.on('data', onErr);
    proc.on('error', reject);
    setTimeout(() => reject(new Error('chrome devtools did not start')), 15000);
  });
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else {
      for (const l of listeners) l(msg);
    }
  });
  const ready = new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  const onEvent = (fn) => listeners.push(fn);
  return { ws, ready, send, onEvent };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const server = await serve();
  const { port } = server.address();
  const { proc, wsUrl } = await launchChrome();
  const cdp = connect(wsUrl);
  await cdp.ready;
  await mkdir(outDir, { recursive: true });

  try {
    for (const { route, w, h, name } of specs) {
      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
      // Only the two-panel /dev/theme harness renders desktop-wide; other dev previews are phones.
      const mobile = route !== 'dev/theme';
      await cdp.send('Page.enable', {}, sessionId);
      await cdp.send(
        'Emulation.setDeviceMetricsOverride',
        { width: w, height: h, deviceScaleFactor: SCALE, mobile },
        sessionId,
      );
      let loaded = false;
      cdp.onEvent((m) => {
        if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') loaded = true;
      });
      await cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/${route}` }, sessionId);
      for (let i = 0; i < 60 && !loaded; i++) await wait(100);
      await wait(1800); // fonts + svg settle
      const { data } = await cdp.send(
        'Page.captureScreenshot',
        { format: 'png', captureBeyondViewport: false },
        sessionId,
      );
      const out = path.join(outDir, (name || route.replace(/\//g, '-')) + '.png');
      await writeFile(out, Buffer.from(data, 'base64'));
      console.log(`shot ${route} @ ${w}x${h} (${mobile ? 'mobile' : 'desktop'}) -> ${out}`);
      await cdp.send('Target.closeTarget', { targetId });
    }
  } finally {
    cdp.ws.close();
    proc.kill();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
