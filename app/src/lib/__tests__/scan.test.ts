import { createAndUploadScan, ScanUploadError, type UploadDeps } from '../scan';

// scan.ts imports the real supabase client (→ AsyncStorage, which throws under Jest); the DI-tested
// orchestration never touches it, so stub the module out (jest hoists this above the import). Only
// uploadPickedScan reads supabase, and these tests exercise createAndUploadScan with injected deps.
jest.mock('../supabase', () => ({ supabase: {} }));

const okDeps = (over: Partial<UploadDeps> = {}): UploadDeps => ({
  invoke: (fn) =>
    Promise.resolve(fn === 'scan-create' ? { data: { scan_id: 's1', upload_url: 'https://x/upload?token=t' }, error: null } : { data: { queued: true }, error: null }),
  readImage: () => Promise.resolve({ body: 'bytes' as unknown as BodyInit, contentType: 'image/jpeg' }),
  putBytes: () => Promise.resolve({ ok: true, status: 200 }),
  ...over,
});

describe('createAndUploadScan', () => {
  it('drives scan-create → PUT → scan-ingest and returns the scan id, threading the hand', async () => {
    const calls: string[] = [];
    const bodies: Record<string, unknown> = {};
    const r = await createAndUploadScan(
      { kind: 'palm', hand: 'left', imageUri: 'blob:x' },
      okDeps({
        invoke: (fn, body) => {
          calls.push(fn);
          bodies[fn] = body;
          return Promise.resolve(
            fn === 'scan-create'
              ? { data: { scan_id: 's1', upload_url: 'https://x/upload?token=t' }, error: null }
              : { data: { queued: true }, error: null },
          );
        },
        putBytes: (url) => {
          calls.push(`put:${url}`);
          return Promise.resolve({ ok: true, status: 200 });
        },
      }),
    );
    expect(r).toEqual({ scanId: 's1' });
    expect(calls).toEqual(['scan-create', 'put:https://x/upload?token=t', 'scan-ingest']);
    // the A3 hand answer reaches the scan-create body; ingest carries the returned id
    expect(bodies['scan-create']).toEqual({ kind: 'palm', hand: 'left' });
    expect(bodies['scan-ingest']).toEqual({ scan_id: 's1' });
  });

  it('omits hand for a face scan', async () => {
    let sentBody: Record<string, unknown> | undefined;
    await createAndUploadScan(
      { kind: 'face', imageUri: 'blob:x' },
      okDeps({
        invoke: (fn, body) => {
          if (fn === 'scan-create') sentBody = body;
          return Promise.resolve(
            fn === 'scan-create' ? { data: { scan_id: 's2', upload_url: 'u' }, error: null } : { data: {}, error: null },
          );
        },
      }),
    );
    expect(sentBody).toEqual({ kind: 'face' });
  });

  it('throws a stage-tagged error when scan-create fails, and never uploads', async () => {
    let uploaded = false;
    await expect(
      createAndUploadScan(
        { kind: 'palm', hand: 'right', imageUri: 'blob:x' },
        okDeps({
          invoke: () => Promise.resolve({ data: null, error: { message: 'rate_limited' } }),
          putBytes: () => {
            uploaded = true;
            return Promise.resolve({ ok: true, status: 200 });
          },
        }),
      ),
    ).rejects.toMatchObject({ stage: 'scan-create' });
    expect(uploaded).toBe(false);
  });

  it('throws a stage-tagged error when scan-create omits scan_id/upload_url', async () => {
    await expect(
      createAndUploadScan(
        { kind: 'palm', hand: 'right', imageUri: 'blob:x' },
        okDeps({ invoke: () => Promise.resolve({ data: { scan_id: 's1' }, error: null }) }),
      ),
    ).rejects.toBeInstanceOf(ScanUploadError);
  });

  it('throws an upload-stage error on a non-ok PUT, and never ingests', async () => {
    let ingested = false;
    await expect(
      createAndUploadScan(
        { kind: 'palm', hand: 'left', imageUri: 'blob:x' },
        okDeps({
          putBytes: () => Promise.resolve({ ok: false, status: 413 }),
          invoke: (fn) => {
            if (fn === 'scan-ingest') ingested = true;
            return Promise.resolve({ data: { scan_id: 's1', upload_url: 'u' }, error: null });
          },
        }),
      ),
    ).rejects.toMatchObject({ stage: 'upload' });
    expect(ingested).toBe(false);
  });

  it('throws an ingest-stage error when confirm fails', async () => {
    await expect(
      createAndUploadScan(
        { kind: 'palm', hand: 'left', imageUri: 'blob:x' },
        okDeps({
          invoke: (fn) =>
            Promise.resolve(
              fn === 'scan-create'
                ? { data: { scan_id: 's1', upload_url: 'u' }, error: null }
                : { data: null, error: { message: 'object_missing' } },
            ),
        }),
      ),
    ).rejects.toMatchObject({ stage: 'scan-ingest' });
  });
});
