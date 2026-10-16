/* Vurata Market: thin adapter that gives the app a small document-store API on top of Supabase. */
(function () {
  'use strict';
  const URL = 'https://wjjexoyectojxdxigprz.supabase.co';
  const KEY = 'sb_publishable__5mdSDs65F8zkTt6r3NrfA_nFfXUA0C';
  const BUCKET = 'product-photos';
  const sb = window.supabase.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  let session = null, admin = false, chanN = 0;

  const ready = (async () => {
    try {
      const r = await sb.auth.getSession(); session = r.data && r.data.session;
      if (session) {
        const q = await sb.from('settings').select('id').eq('id', 'host').limit(1);
        admin = !q.error && Array.isArray(q.data) && q.data.length > 0;
      }
    } catch (e) {}
    return { session, admin };
  })();

  const TABLES = { catalog: 'ledger', customers: 'customers', orders: 'orders', settings: 'settings', live: 'live' };
  function route(path) {
    const p = String(path).split('/');
    if (p[0] === 'data' && p[1] === 'users') return { table: 'prefs', id: p[2] };
    return { table: TABLES[p[0]], id: p.slice(1).join('/') };
  }
  const snapOf = (row, id) => ({ id, exists: !!row, metadata: { hasPendingWrites: false }, data: () => (row ? row.data : undefined) });
  const fail = e => { const err = new Error((e && e.message) || 'db'); err.code = e && e.code; throw err; };

  function listen(table, filter, refetch) {
    let t = null; const kick = () => { clearTimeout(t); t = setTimeout(refetch, 60); };
    const cfg = { event: '*', schema: 'public', table }; if (filter) cfg.filter = filter;
    const ch = sb.channel('c' + (++chanN) + '-' + table).on('postgres_changes', cfg, kick).subscribe();
    const poll = setInterval(() => { if (document.visibilityState === 'visible') refetch(); }, 45000);
    return () => { clearTimeout(t); clearInterval(poll); sb.removeChannel(ch); };
  }

  function docRef(path) {
    const { table, id } = route(path);
    return {
      id,
      async get() { const r = await sb.from(table).select('id,data').eq('id', id).maybeSingle(); if (r.error) fail(r.error); return snapOf(r.data, id); },
      async set(obj) { const r = await sb.from(table).upsert({ id, data: obj, updated_at: new Date().toISOString() }); if (r.error) fail(r.error); },
      async update(patch) { const r = await sb.rpc('doc_merge', { tbl: table, doc_id: id, patch }); if (r.error) fail(r.error); },
      async delete() { const r = await sb.from(table).delete().eq('id', id); if (r.error) fail(r.error); },
      onSnapshot(cb, errCb) {
        let dead = false;
        const run = async () => { try { const s = await this.get(); if (!dead) cb(s); } catch (e) { if (!dead && errCb) errCb(e); } };
        run(); const off = listen(table, 'id=eq.' + id, run);
        return () => { dead = true; off(); };
      }
    };
  }

  function collection(name) {
    const table = TABLES[name]; let field = null, asc = true, lim = 100;
    const api = {
      orderBy(f, dir) { field = f; asc = dir !== 'desc'; return api; },
      limit(n) { lim = n; return api; },
      async get() {
        let q = sb.from(table).select('id,data');
        if (field) q = q.order('data->' + field, { ascending: asc, nullsFirst: false });
        const r = await q.limit(lim); if (r.error) fail(r.error);
        return { docs: (r.data || []).map(row => ({ id: row.id, data: () => row.data })) };
      },
      onSnapshot(cb, errCb) {
        let dead = false;
        const run = async () => { try { const s = await api.get(); if (!dead) cb(s); } catch (e) { if (!dead && errCb) errCb(e); } };
        run(); const off = listen(table, null, run);
        return () => { dead = true; off(); };
      }
    };
    return api;
  }

  const db = { doc: docRef, collection };

  const user = {
    async id() { return session ? session.user.id : null; },
    async can() { return admin; },
    async profiles(ids) { const o = {}; (ids || []).forEach(i => { o[i] = { name: session && i === session.user.id ? 'you' : 'a teammate' }; }); return o; }
  };

  const downloads = {
    async save({ filename, data }) {
      const type = /\.pdf$/i.test(filename) ? 'application/pdf' : /\.csv$/i.test(filename) ? 'text/csv;charset=utf-8' : /\.json$/i.test(filename) ? 'application/json' : 'application/octet-stream';
      const blob = new Blob([data], { type });
      try {
        const f = new File([blob], filename, { type: blob.type.split(';')[0] });
        if (navigator.canShare && navigator.canShare({ files: [f] }) && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) { await navigator.share({ files: [f], title: filename }); return; }
      } catch (e) { if (e && e.name === 'AbortError') { const d = new Error('declined'); d.code = 'declined'; throw d; } }
      const a = document.createElement('a'); a.href = window.URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(() => { window.URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    }
  };

  const assets = {
    async upload(blob, opts) {
      const id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + '.jpg';
      const r = await sb.storage.from(BUCKET).upload(id, blob, { contentType: (opts && opts.type) || 'image/jpeg', cacheControl: '31536000' });
      if (r.error) { const e = new Error(r.error.message); e.code = /size|large|413/i.test(r.error.message + r.error.statusCode) ? 'too_large' : 'upload'; throw e; }
      return { id };
    },
    async delete(id) { await sb.storage.from(BUCKET).remove([id]); }
  };

  window.SB = {
    ready,
    isAdmin: () => admin,
    email: () => (session && session.user.email) || '',
    imgUrl: id => URL + '/storage/v1/object/public/' + BUCKET + '/' + encodeURIComponent(id),
    async signIn(email, password) { const r = await sb.auth.signInWithPassword({ email, password }); if (r.error) throw r.error; return r.data; },
    async signOut() { try { await sb.auth.signOut(); } catch (e) {} },
    hasStoredSession() { try { return Object.keys(localStorage).some(k => /^sb-.*-auth-token$/.test(k) && localStorage.getItem(k)); } catch (e) { return false; } }
  };

  window.claude = {
    async use(name) {
      await ready;
      if (name === 'db') return db;
      if (name === 'user') return user;
      if (name === 'downloads') return downloads;
      if (name === 'assets') return admin ? assets : null;
      return null;
    }
  };
})();
