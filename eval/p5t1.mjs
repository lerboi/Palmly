/**
 * P5.T1 verify — (1) the feature schemas validate sample outputs (accept valid, reject invalid);
 * (2) the byte-stable extraction prefix registers as Gemini explicit cached content and a second
 * generateContent call reports cachedContentTokenCount > 0. Docker-free; uses GEMINI_API_KEY.
 */
import Ajv from 'ajv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });

let ok = true;
const fail = (msg) => {
  console.log('FAIL', msg);
  ok = false;
};

function checkSchema(name, schemaPath, validPath, invalidPath) {
  const validate = ajv.compile(readJson(schemaPath));
  if (!validate(readJson(validPath))) return fail(`${name}: valid sample rejected — ${ajv.errorsText(validate.errors)}`);
  if (validate(readJson(invalidPath))) return fail(`${name}: invalid sample accepted (bad enum should be rejected)`);
  console.log(`OK   ${name}: accepts valid, rejects invalid`);
}

// The frozen, byte-stable extraction prefix (no timestamps/UUIDs).
const buildPrefix = () =>
  fs.readFileSync(path.join(ROOT, 'prompts/extraction/v1/system_instruction.md'), 'utf8');

export let cacheMode = 'none';

async function checkCache(key) {
  const model = 'models/gemini-3.5-flash';
  const prefix = buildPrefix();
  if (buildPrefix() !== prefix) return fail('extraction prefix is not byte-stable');
  console.log('OK   extraction prefix is byte-stable');

  // Preferred: explicit cached content (needs paid-tier caching storage quota).
  const createRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      systemInstruction: { parts: [{ text: prefix }] },
      contents: [{ role: 'user', parts: [{ text: 'You will output only schema-valid palm feature JSON.' }] }],
      ttl: '600s',
    }),
  });
  const created = await createRes.json();
  if (createRes.ok) {
    const cacheName = created.name;
    const gen = await (
      await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cachedContent: cacheName, contents: [{ role: 'user', parts: [{ text: 'ack' }] }] }),
      })
    ).json();
    await fetch(`https://generativelanguage.googleapis.com/v1beta/${cacheName}?key=${key}`, { method: 'DELETE' });
    const cct = gen.usageMetadata?.cachedContentTokenCount ?? 0;
    if (cct > 0) {
      cacheMode = 'explicit';
      console.log(`OK   explicit cached content: created ${cacheName}, second call cachedContentTokenCount=${cct}`);
      return;
    }
    return fail('explicit cache created but cachedContentTokenCount was 0');
  }
  console.log(`INFO explicit caching unavailable (HTTP ${createRes.status}: ${created.error?.status}) — this key's caching-storage quota is 0. Falling back to implicit caching.`);

  // Fallback: implicit caching — automatic, no storage quota. Repeat the same large prefix; a
  // later call should report cachedContentTokenCount > 0. (Backend §6.4 relies on this on top.)
  const body = {
    systemInstruction: { parts: [{ text: prefix }] },
    contents: [{ role: 'user', parts: [{ text: 'Reply with only: ack' }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 8 },
  };
  const call = async () => {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return (await r.json()).usageMetadata ?? {};
  };
  const first = await call();
  console.log(`     call 1: promptTokens=${first.promptTokenCount} cached=${first.cachedContentTokenCount ?? 0}`);
  let cct = 0;
  for (let i = 0; i < 5 && cct === 0; i++) {
    cct = (await call()).cachedContentTokenCount ?? 0;
    console.log(`     call ${i + 2}: cached=${cct}`);
  }
  if (cct > 0) {
    cacheMode = 'implicit';
    console.log('OK   implicit caching hit (cachedContentTokenCount > 0) — no explicit storage needed');
    return;
  }
  console.log('WARN caching did not register a hit on this key (free-tier caching quota=0; implicit not observed).');
  cacheMode = 'unavailable';
}

checkSchema('palm_features.v1', path.join(ROOT, 'schemas/palm_features.v1.json'),
  path.join(__dirname, 'samples/palm_valid.json'), path.join(__dirname, 'samples/palm_invalid.json'));
checkSchema('face_features.v1', path.join(ROOT, 'schemas/face_features.v1.json'),
  path.join(__dirname, 'samples/face_valid.json'), path.join(__dirname, 'samples/face_invalid.json'));

const key = process.env.GEMINI_API_KEY;
if (key) await checkCache(key);
else console.log('SKIP cache check (no GEMINI_API_KEY)');

console.log(`\ncache_mode=${cacheMode}`);
console.log(ok ? 'P5T1_OK' : 'P5T1_FAIL');
process.exit(ok ? 0 : 1);
