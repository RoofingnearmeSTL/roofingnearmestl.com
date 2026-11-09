import test from 'node:test'
import assert from 'node:assert/strict'
import { loadTs } from './helpers/load-ts.mjs'

const cache = new Map()
const { createSupabaseBrainStore } = loadTs('src/lib/data-store/brain-store.ts', { cache })
const { MissingTableError, StoreError } = loadTs('src/lib/data-store/errors.ts', { cache })

function fakeClient(script = () => ({ data: [], error: null })) {
  const calls = []
  const client = {
    calls,
    from(table) {
      const rec = { table, op: 'select', columns: null, filters: [], onConflict: null, payload: null, range: null }
      calls.push(rec)
      const b = {
        select(c) { if (rec.op === 'select' || rec.op === 'insert') rec.columns = c; return b },
        insert(p) { rec.op = 'insert'; rec.payload = p; return b },
        upsert(p, o) { rec.op = 'upsert'; rec.payload = p; rec.onConflict = o?.onConflict ?? null; return b },
        update(p) { rec.op = 'update'; rec.payload = p; return b },
        delete() { rec.op = 'delete'; return b },
        eq(c, v) { rec.filters.push(['eq', c, v]); return b },
        in(c, v) { rec.filters.push(['in', c, v]); return b },
        range(a, z) { rec.range = [a, z]; return b },
        single() { rec.single = true; return b },
        then(res, rej) { return Promise.resolve(script(rec)).then(res, rej) },
      }
      return b
    },
  }
  return client
}

test('upserts use the right conflict keys and batch sizes', async () => {
  const c = fakeClient()
  const s = createSupabaseBrainStore(c)
  await s.upsertNotes(Array.from({ length: 120 }, (_, i) => ({ path: `a${i}.md` })))
  await s.upsertLinks([{ from_path: 'a', to_path: 'b', kind: 'link' }])
  await s.upsertScans([{ company: 'x', scan_date: '2026-10-29' }])
  await s.upsertRecommendations([{ company: 'x', rec_id: 'AB-1' }])
  const up = c.calls.filter((x) => x.op === 'upsert')
  assert.deepEqual(up.slice(0, 3).map((x) => x.payload.length), [50, 50, 20])
  assert.deepEqual(up.map((x) => x.onConflict).filter((v, i) => i >= 3), ['from_path,to_path', 'company,scan_date', 'company,rec_id'])
  assert.equal(up[0].onConflict, 'path')
})

test('listNotes pages with range until a short page', async () => {
  const c = fakeClient((rec) => {
    const n = rec.range[0] === 0 ? 1000 : rec.range[0] === 1000 ? 1000 : 5
    return { data: Array.from({ length: n }, (_, i) => ({ path: `p${rec.range[0] + i}.md`, git_sha: 'a', links: [] })), error: null }
  })
  const notes = await createSupabaseBrainStore(c).listNotes()
  assert.equal(notes.length, 2005)
  assert.deepEqual(c.calls.map((x) => x.range), [[0, 999], [1000, 1999], [2000, 2999]])
  assert.equal(notes[0].gitSha, 'a')
})

test('deletes are chunked by 100 and grouped', async () => {
  const c = fakeClient()
  const s = createSupabaseBrainStore(c)
  await s.deleteNotes(Array.from({ length: 250 }, (_, i) => `n${i}.md`))
  assert.deepEqual(c.calls.map((x) => x.filters[0][2].length), [100, 100, 50])
  const d = fakeClient()
  await createSupabaseBrainStore(d).deleteLinks([{ from_path: 'a', to_path: 'b' }, { from_path: 'a', to_path: 'c' }, { from_path: 'x', to_path: 'y' }])
  assert.equal(d.calls.length, 2)
  assert.deepEqual(d.calls[0].filters, [['eq', 'from_path', 'a'], ['in', 'to_path', ['b', 'c']]])
})

test('run rows: start inserts, finish updates by id', async () => {
  const c = fakeClient((rec) => (rec.op === 'insert' ? { data: { id: 7 }, error: null } : { data: null, error: null }))
  const s = createSupabaseBrainStore(c)
  assert.equal(await s.startRun({ kind: 'brain', trigger: 'cron' }), 7)
  await s.finishRun(7, { ok: false, error: 'x'.repeat(900) })
  const upd = c.calls.find((x) => x.op === 'update')
  assert.deepEqual(upd.filters, [['eq', 'id', 7]])
  assert.equal(upd.payload.ok, false)
  assert.equal(upd.payload.error.length, 500)
})

test('missing-table codes become MissingTableError; others a StoreError with only the safe code', async () => {
  for (const code of ['PGRST205', '42P01']) {
    const s = createSupabaseBrainStore(fakeClient(() => ({ data: null, error: { code, message: 'secret detail' } })))
    await assert.rejects(s.listNotes(), (e) => e instanceof MissingTableError)
  }
  const s = createSupabaseBrainStore(fakeClient(() => ({ data: null, error: { code: '23505', message: 'secret detail row data' } })))
  await assert.rejects(s.upsertNotes([{ path: 'a.md' }]), (e) => e instanceof StoreError && e.message === 'Database save notes failed (23505)' && !/secret/.test(e.message))
  const odd = createSupabaseBrainStore(fakeClient(() => ({ data: null, error: { code: 'weird code!', message: 'x' } })))
  await assert.rejects(odd.listLinks(), (e) => e.message === 'Database read links failed (unknown)')
})

test('no select reads * or the note body', async () => {
  const c = fakeClient()
  const s = createSupabaseBrainStore(c)
  await s.listNotes(); await s.listLinks(); await s.listScans(); await s.listRecommendationKeys()
  for (const x of c.calls) {
    assert.ok(!x.columns.includes('*'))
    assert.ok(!/\bbody\b/.test(x.columns))
  }
})
