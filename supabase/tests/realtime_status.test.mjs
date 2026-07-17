/**
 * P5.T7 (backend half) — live scan-status delivery (Backend §6.1). Transactional / rolled back.
 * The AFTER UPDATE trigger on scans broadcasts each status transition to the private Realtime
 * topic `scan:{id}`; RLS on realtime.messages restricts that topic to the scan's owner.
 *
 * realtime.messages is RANGE(inserted_at)-partitioned and has no partitions on staging, so the
 * functional tests first create today's partition (as its owner role, which postgres is a member
 * of) inside the rolled-back transaction — the honest way to observe a real broadcast row.
 *
 * The client fetch-then-subscribe hook + the on-device verify ("live transitions; kill/relaunch
 * recovers") are gated on a physical device (Human-tasks H1) → P5.T7 stays [~] until then.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRollback, applyMigrations, seedUser, asRole, resetRole } from './lib/db.mjs';

const A = '44444444-4444-4444-4444-444444444444';
const B = '55555555-5555-5555-5555-555555555555';
const one = async (c, sql, p = []) => (await c.query(sql, p)).rows[0];
const n = async (c, sql, p = []) => (await c.query(sql, p)).rows[0].n;

/** Ensure a partition of realtime.messages covers now() so broadcast inserts land + are observable. */
async function ensureTodayPartition(c) {
  const { d0, d1 } = await one(c, `select date_trunc('day', now())::date::text d0, (date_trunc('day', now())+interval '1 day')::date::text d1`);
  await c.query('savepoint part');
  try {
    await c.query('set local role supabase_realtime_admin'); // postgres is a member of the owner role
    await c.query(`create table realtime.messages_p5t7_test partition of realtime.messages for values from ('${d0}') to ('${d1}')`);
    await c.query('reset role');
  } catch (e) {
    await c.query('rollback to savepoint part'); // a real partition already covers today → fine
    if (!/overlap|already exists/i.test(e.message)) throw e;
  }
}

test('trigger scan_status_broadcast is wired: after update of status, only on change', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    const t = (await c.query(`select pg_get_triggerdef(oid) def from pg_trigger where tgrelid='public.scans'::regclass and tgname='scan_status_broadcast' and not tgisinternal`)).rows;
    assert.equal(t.length, 1, 'trigger exists');
    assert.match(t[0].def, /AFTER UPDATE OF status/i);
    assert.match(t[0].def, /broadcast_scan_status/);
    assert.match(t[0].def, /old\.status IS DISTINCT FROM new\.status/i);
  });
});

test('RLS policy scan_owner_receives_status exists on realtime.messages (select, authenticated)', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    const p = (await c.query(`select cmd, roles::text roles, qual from pg_policies where schemaname='realtime' and tablename='messages' and policyname='scan_owner_receives_status'`)).rows;
    assert.equal(p.length, 1, 'policy exists');
    assert.equal(p[0].cmd, 'SELECT');
    assert.match(p[0].roles, /authenticated/);
    assert.match(p[0].qual, /realtime\.topic\(\)/);
    assert.match(p[0].qual, /scans/);
  });
});

test('a status transition broadcasts to scan:{id} carrying the new status; unchanged does not', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    await ensureTodayPartition(c);
    const scan = await one(c, `insert into public.scans (user_id,kind,side,status) values ($1,'palm','left','queued') returning id`, [A]);
    const topic = `scan:${scan.id}`;

    await c.query(`update public.scans set status='extracting' where id=$1`, [scan.id]);
    const rows = (await c.query(`select event, payload->'record'->>'status' st, private from realtime.messages where topic=$1`, [topic])).rows;
    assert.equal(rows.length, 1, 'one broadcast on a real transition');
    assert.equal(rows[0].event, 'status');
    assert.equal(rows[0].st, 'extracting', 'payload.record carries the new status');
    assert.equal(rows[0].private, true, 'broadcast is on a private channel');

    // unchanged status → the WHEN clause suppresses the broadcast
    await c.query(`update public.scans set status='extracting' where id=$1`, [scan.id]);
    assert.equal(await n(c, `select count(*)::int n from realtime.messages where topic=$1`, [topic]), 1, 'no broadcast when status is unchanged');

    // the rest of the pipeline sequence each broadcasts (order not asserted: same-txn inserted_at)
    await c.query(`update public.scans set status='narrating' where id=$1`, [scan.id]);
    await c.query(`update public.scans set status='complete' where id=$1`, [scan.id]);
    const statuses = (await c.query(`select payload->'record'->>'status' s from realtime.messages where topic=$1`, [topic])).rows.map((r) => r.s).sort();
    assert.deepEqual(statuses, ['complete', 'extracting', 'narrating'], 'every transition broadcast exactly once');
  });
});

test('realtime.messages RLS: scan owner receives its topic; stranger and non-scan topics do not', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    await seedUser(c, B);
    await ensureTodayPartition(c);
    const scan = await one(c, `insert into public.scans (user_id,kind,status) values ($1,'palm','queued') returning id`, [A]);
    await c.query(`update public.scans set status='complete' where id=$1`, [scan.id]); // emit a broadcast row
    assert.equal(await n(c, `select count(*)::int n from realtime.messages where topic=$1`, [`scan:${scan.id}`]), 1, 'broadcast row present (superuser view)');

    const seesUnder = async (uid, topic) => {
      await asRole(c, { uid, role: 'authenticated' });
      await c.query(`select set_config('realtime.topic', $1, true)`, [topic]);
      const cnt = await n(c, `select count(*)::int n from realtime.messages`);
      await resetRole(c);
      return cnt;
    };

    assert.ok((await seesUnder(A, `scan:${scan.id}`)) >= 1, 'owner is authorized for its own scan topic');
    assert.equal(await seesUnder(B, `scan:${scan.id}`), 0, 'stranger is not authorized for the topic');
    assert.equal(await seesUnder(A, 'lobby'), 0, 'a non-scan topic is denied even to the owner');
  });
});

test('Low (B20): the broadcast payload is narrowed to status — storage_path/capture_meta never reach the wire', async () => {
  await withRollback(async (c) => {
    await applyMigrations(c);
    await seedUser(c, A);
    await ensureTodayPartition(c);
    // A scan carrying exactly the fields the OLD full-row broadcast shipped. This asserts on the
    // EMITTED ROW rather than on the function's source text: grepping pg_get_functiondef for
    // 'storage_path' proves nothing about the payload — and that check genuinely misfired during
    // this task, because the new function's own comment contains the old helper's name.
    const scan = await one(
      c,
      `insert into public.scans (user_id,kind,side,status,storage_path,capture_meta,keep_image)
       values ($1,'palm','left','queued','users/a44/palm-secret.jpg','{"device":"pixel-9","lux":42}'::jsonb,true)
       returning id`,
      [A],
    );
    const topic = `scan:${scan.id}`;
    await c.query(`update public.scans set status='complete' where id=$1`, [scan.id]);

    const { payload } = await one(c, `select payload from realtime.messages where topic=$1`, [topic]);

    // the client (app/src/lib/useScanStatus.ts:69) reads payload.record.status / .failure_reason —
    // the envelope must survive; only its contents shrink.
    assert.deepEqual(Object.keys(payload.record).sort(), ['failure_reason', 'id', 'status']);
    assert.equal(payload.record.status, 'complete');
    assert.deepEqual(Object.keys(payload.old_record), ['status'], 'old_record says what it moved FROM, nothing else');
    assert.equal(payload.old_record.status, 'queued');

    // and the whole envelope, not just `record`, is free of the private bucket key + capture meta
    const wire = JSON.stringify(payload);
    assert.ok(!wire.includes('palm-secret.jpg'), 'the private storage key must not be on a websocket');
    assert.ok(!wire.includes('pixel-9'), 'capture_meta must not be on the wire');
    assert.ok(!wire.includes('keep_image'), 'nor any other row column');
  });
});
