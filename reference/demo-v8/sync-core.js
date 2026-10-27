/* Sailor Logbook — MIT. A small, transport-independent record merge engine. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LogbookSync = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const arrays = ['entries', 'tasks', 'docks', 'best', 'les', 'grat'];
  const scalars = ['name', 'full', 'av', 'order', 'hide', 'rorder', 'rhide'];
  const clone = value => JSON.parse(JSON.stringify(value));
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const key = (...path) => JSON.stringify(path);
  const blank = () => ({ format: 'slb-records', version: 1, records: {} });
  const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
  const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
  function flatten(s) {
    const out = {};
    for (const type of arrays) for (const item of s[type] || []) {
      const value=clone(item);
      if(type==='docks')delete value.r; // Recency belongs to the device, not the shared category.
      out[key(type, item.id)] = value;
    }
    for (const field of scalars) if (s[field] !== undefined) out[key(field)] = clone(s[field]);
    // Device preferences (including startup, zoom and onboarding) stay on their device.
    for (const [d, value] of Object.entries(s.mood || {})) out[key('mood', d)] = value;
    for (const [id, value] of Object.entries(s.ach || {})) out[key('ach', id)] = value;
    for (const preset of s.pre || []) out[key('pre', JSON.stringify(preset))] = clone(preset);
    for (const d of s.bt || []) out[key('bt', d)] = true;
    for (const [month, days] of Object.entries(s.seen || {})) for (const d of days) out[key('seen', month, d)] = true;
    for (const [d, page] of Object.entries(s.nb || {})) {
      const { lines, ...paper } = page;
      out[key('nb', d)] = clone(paper);
      (lines || []).forEach((line, order) => { out[key('line', d, line.id)] = { line: clone(line), order }; });
    }
    return out;
  }
  function edit(doc, k, value, device, deleted = false) {
    const prior = doc.records[k], clock = { ...(prior?.clock || {}) };
    clock[device] = (clock[device] || 0) + 1;
    const n = Math.max(0, ...Object.values(prior?.clock || {})) + 1;
    doc.records[k] = { clock, stamp: [n, device], deleted, ...(deleted ? {} : { value: clone(value) }) };
  }
  function capture(doc, state, device) {
    const out = clone(doc), flat = flatten(state);
    for (const [k, value] of Object.entries(flat)) {
      const r = out.records[k];
      if (!r || r.deleted || !equal(r.value, value)) edit(out, k, value, device);
    }
    for (const k of Object.keys(out.records)) {
      if (JSON.parse(k)[0] !== 'conflict' && !Object.hasOwn(flat, k) && !out.records[k].deleted) edit(out, k, null, device, true);
    }
    return out;
  }
  function dominates(a, b) {
    return Object.entries(b.clock).every(([d, n]) => (a.clock[d] || 0) >= n);
  }
  function compare(a, b) { return a.stamp[0] - b.stamp[0] || (a.stamp[1] < b.stamp[1] ? -1 : a.stamp[1] > b.stamp[1] ? 1 : 0); }
  function merge(a, b) {
    const out = blank(), conflicts = [];
    for (const k of [...new Set([...Object.keys(a.records), ...Object.keys(b.records)])].sort()) {
      const x = a.records[k], y = b.records[k];
      if (!x || !y) { out.records[k] = clone(x || y); continue; }
      const xd = dominates(x, y), yd = dominates(y, x);
      if (xd || yd) { out.records[k] = clone(xd ? x : y); continue; }
      const win = compare(x, y) >= 0 ? x : y, lose = win === x ? y : x;
      const clock = { ...x.clock };
      for (const [d, n] of Object.entries(y.clock)) clock[d] = Math.max(clock[d] || 0, n);
      out.records[k] = { ...clone(win), clock };
      if (!equal(x.value, y.value) || x.deleted !== y.deleted) {
        if (JSON.parse(k)[0] !== 'conflict') conflicts.push({ k, lose });
      }
    }
    for (const { k, lose } of conflicts) {
      const ck = key('conflict', k, JSON.stringify(lose.stamp));
      if (!out.records[ck]) out.records[ck] = {
        clock: clone(lose.clock), stamp: clone(lose.stamp), deleted: false,
        value: { key: k, version: clone(lose) }
      };
    }
    // Concurrent offline additions must not exceed the product’s four best things/day.
    // Keep overflow recoverable, using deterministic versioned tombstones.
    const bestByDay={};
    for(const [k,r] of Object.entries(out.records))if(JSON.parse(k)[0]==='best'&&!r.deleted)(bestByDay[r.value.date]||=[]).push([k,r]);
    for(const list of Object.values(bestByDay)){
      list.sort((a,b)=>compare(b[1],a[1])||(a[0]<b[0]?-1:1));
      for(const [k,r] of list.slice(4)){
        const ck=key('conflict',k,JSON.stringify(r.stamp));
        out.records[ck]||={clock:clone(r.clock),stamp:clone(r.stamp),deleted:false,value:{key:k,version:clone(r)}};
        edit(out,k,null,'bestLimit',true);
      }
    }
    return out;
  }
  function materialize(doc, local) {
    const s = clone(local), lines = {};
    for (const type of arrays) s[type] = [];
    s.nb = {}; s.pre = []; s.bt = []; s.seen = {}; s.mood = {}; s.ach = {};
    for (const k of Object.keys(doc.records).sort()) {
      const r = doc.records[k]; if (r.deleted) continue;
      const [type, id, sub] = JSON.parse(k), value = clone(r.value);
      if (arrays.includes(type)) {
        if(type==='docks')value.r=(local.docks||[]).find(x=>x.id===value.id)?.r||0;
        s[type].push(value);
      }
      else if (scalars.includes(type)) s[type] = value;
      else if (type === 'mood' || type === 'ach') s[type][id] = value;
      else if (type === 'pre') s.pre.push(value);
      else if (type === 'bt') s.bt.push(id);
      else if (type === 'seen') (s.seen[id] ||= []).push(sub);
      else if (type === 'nb') s.nb[id] = { ...value, lines: [] };
      else if (type === 'line') (lines[id] ||= []).push(value);
    }
    for (const [d, items] of Object.entries(lines)) {
      (s.nb[d] ||= {}).lines = items.sort((a,b) => a.order - b.order || a.line.id.localeCompare(b.line.id)).map(x => x.line);
    }
    for (const page of Object.values(s.nb)) page.lines ||= [];
    return s;
  }
  function validate(doc) {
    const raw = JSON.stringify(doc);
    if (raw.length > 8 * 1024 * 1024 || /"(?:__proto__|constructor|prototype)"\s*:/.test(raw)) throw Error('Unsafe or oversized sync file.');
    if (doc?.format !== 'slb-records' || doc.version !== 1 || !doc.records || Array.isArray(doc.records)) throw Error('Unsupported Dropbox file.');
    for (const [k, r] of Object.entries(doc.records)) {
      const path = JSON.parse(k), [type, id, sub] = path;
      if (![...arrays, ...scalars, 'mood','ach','pre','bt','seen','nb','line','conflict'].includes(type)) throw Error('Unknown sync record.');
      const count = scalars.includes(type) ? 1 : ['line','seen','conflict'].includes(type) ? 3 : 2;
      if (!Array.isArray(path) || path.length !== count || path.some(x=>typeof x !== 'string' || ['__proto__','constructor','prototype'].includes(x))) throw Error('Unsafe record path.');
      if (!r || typeof r.deleted !== 'boolean' || !r.clock || !Array.isArray(r.stamp) || r.stamp.length !== 2 || !Number.isSafeInteger(r.stamp[0]) || !safeId(r.stamp[1])) throw Error('Invalid sync version.');
      if (!Object.entries(r.clock).every(([d,n]) => safeId(d) && Number.isSafeInteger(n) && n >= 0)) throw Error('Invalid sync clock.');
      if (arrays.includes(type) && !safeId(id)) throw Error('Invalid record ID.');
      if (['mood','bt','nb','line'].includes(type) && !date(id)) throw Error('Invalid record date.');
      if (type === 'line' && !safeId(sub)) throw Error('Invalid notebook ID.');
      if (r.deleted) continue;
      const v = r.value;
      const image = value => !value || (typeof value === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(value));
      const strokes = list => list == null || (Array.isArray(list) && list.every(s=>s && /^#[0-9a-f]{3,8}$/i.test(s.c) && Number.isFinite(s.w) && s.w>0 && s.w<=50 && Array.isArray(s.p) && s.p.every(p=>Array.isArray(p) && p.length===2 && p.every(n=>Number.isFinite(n) && Math.abs(n)<=100))));
      if (['name','full'].includes(type) && typeof v !== 'string') throw Error('Invalid profile.');
      if (type === 'av' && !image(v)) throw Error('Invalid profile image.');
      if (['order','hide','rorder','rhide'].includes(type) && (!Array.isArray(v) || !v.every(x=>typeof x==='string' && /^[a-z0-9_-]+$/.test(x)))) throw Error('Invalid layout.');
      if (arrays.includes(type) && (!v || v.id !== id)) throw Error('Invalid record value.');
      if (type === 'entries' && (!date(v.date) || !Number.isFinite(v.s) || !Number.isFinite(v.e) || v.s < 0 || v.e > 1440 || v.e <= v.s || typeof v.t !== 'string')) throw Error('Invalid logged time.');
      if (type === 'tasks' && (!date(v.date) || typeof v.t !== 'string' || (v.time != null && (!Number.isFinite(v.time) || v.time < 0 || v.time >= 1440)) || (v.dur != null && (!Number.isFinite(v.dur) || v.dur <= 0 || v.dur > 1440)) || !['todo','doing','stuck','done','skip','nogo'].includes(v.st))) throw Error('Invalid task.');
      if (type === 'docks' && (typeof v.n !== 'string' || !/^#[0-9a-f]{6}$/i.test(v.c) || (v.p != null && !safeId(v.p)))) throw Error('Invalid deck.');
      if (v?.photo && !image(v.photo)) throw Error('Invalid photo.');
      if (['entries','tasks'].includes(type) && v.pct != null && (!Number.isFinite(v.pct) || v.pct<0 || v.pct>100)) throw Error('Invalid progress.');
      if (type === 'line' && (!v?.line || v.line.id !== sub || typeof v.line.t !== 'string' || !Number.isInteger(v.order))) throw Error('Invalid notebook line.');
      if (type === 'line' && (!image(v.line.dd) || !strokes(v.line.sk) || (v.line.d != null && !safeId(v.line.d)))) throw Error('Invalid notebook drawing.');
      if (type === 'nb' && (!v || typeof v !== 'object' || Array.isArray(v) || !image(v.draw) || !strokes(v.fsk))) throw Error('Invalid notebook page.');
      // The preset editor stores 0 when no duration was chosen.
      if (type === 'pre' && !(typeof v==='string' || (v && typeof v.t==='string' && (v.d==null || safeId(v.d)) && (v.dur==null || (Number.isFinite(v.dur) && v.dur>=0 && v.dur<=1440))))) throw Error('Invalid preset.');
      if (type === 'bt' && v !== true) throw Error('Invalid sent bottle.');
      if (type === 'seen' && v !== true) throw Error('Invalid bottle history.');
      if (type === 'conflict') {
        if (!v || typeof v.key!=='string' || !v.version || JSON.parse(v.key)[0]==='conflict') throw Error('Invalid saved conflict.');
        validate({format:'slb-records',version:1,records:{[v.key]:v.version}});
      }
      if (['best','les','grat'].includes(type) && (!date(v.date) || typeof v.t !== 'string')) throw Error('Invalid reflection.');
      if (['entries','tasks','best'].includes(type) && v.ref != null && !safeId(v.ref)) throw Error('Invalid reference.');
      if (['entries','tasks'].includes(type) && v.d != null && !safeId(v.d)) throw Error('Invalid deck reference.');
      if (type === 'seen' && (!/^\d{4}-\d{2}$/.test(id) || !date(sub))) throw Error('Invalid bottle history.');
      if (type === 'mood' && (!Number.isInteger(v) || v < 0 || v > 4)) throw Error('Invalid mood.');
    }
    return doc;
  }
  const conflicts = doc => Object.entries(doc.records).filter(([k,r]) => JSON.parse(k)[0] === 'conflict' && !r.deleted).map(([id,r]) => ({ id, ...clone(r.value) }));
  function resolve(doc, conflictKey, restore, device) {
    const out = clone(doc), c = out.records[conflictKey];
    if (!c || c.deleted) return out;
    if (restore) edit(out, c.value.key, c.value.version.value, device, c.value.version.deleted);
    edit(out, conflictKey, null, device, true);
    return out;
  }
  const b64 = bytes => {
    let text = ''; for (const b of bytes) text += String.fromCharCode(b);
    return btoa(text);
  };
  const un64 = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
  async function derive(password, salt, crypto) {
    const source = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name:'PBKDF2', salt, iterations:310000, hash:'SHA-256' }, source, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
  }
  async function encode(doc, password, crypto = globalThis.crypto) {
    if (!password) return JSON.stringify(doc);
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const secret = await derive(password, salt, crypto);
    const body = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, secret, new TextEncoder().encode(JSON.stringify(doc)));
    return JSON.stringify({ format:'slb-encrypted', version:1, salt:b64(salt), iv:b64(iv), body:b64(new Uint8Array(body)) });
  }
  async function decode(text, password, crypto = globalThis.crypto) {
    if (text.length > 12 * 1024 * 1024) throw Error('Dropbox file is too large.');
    let doc = JSON.parse(text);
    if (doc.format === 'slb-encrypted') {
      if (!password) throw Error('Enter this logbook’s encryption passphrase in Sync settings.');
      if (doc.version !== 1 || un64(doc.salt).length !== 16 || un64(doc.iv).length !== 12) throw Error('Invalid encrypted file.');
      try {
        const secret = await derive(password, un64(doc.salt), crypto);
        const bytes = await crypto.subtle.decrypt({ name:'AES-GCM', iv:un64(doc.iv) }, secret, un64(doc.body));
        doc = JSON.parse(new TextDecoder().decode(bytes));
      } catch { throw Error('Unable to decrypt. Check the passphrase; no data was replaced.'); }
    }
    return validate(doc);
  }
  return { blank, flatten, capture, merge, materialize, validate, conflicts, resolve, encode, decode, equal };
});
