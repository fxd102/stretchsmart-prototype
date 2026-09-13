/* StretchSmart — user preferences store
 *
 * WHY THIS FILE EXISTS AND WHY IT IS NOT A BACKEND (2026-09-12)
 * Faith's plan: real users eventually, on a private repo, with a server. Right
 * now she is testing the onboarding flow herself on the public prototype. Her
 * stated test loop is "give different answers, check they're obeyed, wipe them,
 * try another set" — and every step of that works without a server.
 *
 * So this is deliberately an ADAPTER, not a decision. The SCHEMA below is the
 * part that carries forward; only _read/_write change when a backend arrives.
 * Building it this way means nothing here is throwaway, and it avoids standing
 * up an unauthenticated data surface for health-adjacent behavioural data while
 * the repo is still public — which is the one sequencing risk in her plan.
 *
 * TO ADD A BACKEND LATER: implement _read/_write against your endpoint, make
 * load()/save() async, and await them at the three call sites (onboarding
 * finish, nudge selection, prefs panel). Nothing else changes.
 */
(function (global) {
  'use strict';

  var KEY = 'ss_prefs_v1';
  var SCHEMA = 1;

  // The shape that survives the move to a server. Null means "not answered".
  function empty() {
    return {
      schema: SCHEMA,
      updated: null,
      concerns: [],            // up to 3 concern ids, e.g. "back_pain"
      age_range: null,         // "Under 30" | "30s" | ... | "70+"
      tailoring: null,         // "Female" | "Male" | "Prefer not to say"
      max_nudges_per_day: null,// 2..5  — mirrors MAX_NUDGES_PER_DAY in scan_and_nudge.py
      min_gap_hours: null      // 1 | 1.5 | 2 | 3 — mirrors MIN_HOURS_BETWEEN
    };
  }

  // --- adapter seam -------------------------------------------------------
  function _read() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
    catch (e) { return null; }
  }
  function _write(obj) {
    try { localStorage.setItem(KEY, JSON.stringify(obj)); return true; }
    catch (e) { return false; }   // private mode / quota: fail soft, never throw
  }
  function _erase() {
    try { localStorage.removeItem(KEY); return true; } catch (e) { return false; }
  }
  // ------------------------------------------------------------------------

  function load() {
    var got = _read();
    if (!got || got.schema !== SCHEMA) return empty();  // unknown version -> ignore, don't guess
    var base = empty();
    for (var k in base) if (Object.prototype.hasOwnProperty.call(got, k)) base[k] = got[k];
    return base;
  }

  function save(patch) {
    var cur = load();
    for (var k in patch) if (Object.prototype.hasOwnProperty.call(cur, k)) cur[k] = patch[k];
    cur.schema = SCHEMA;
    cur.updated = new Date().toISOString();
    return _write(cur) ? cur : null;
  }

  function clear() { return _erase(); }

  function isSet() {
    var p = load();
    return !!(p.updated && (p.concerns.length || p.age_range || p.tailoring ||
                            p.max_nudges_per_day || p.min_gap_hours));
  }

  /* Human-readable dump, so a tester can SEE what is stored rather than
     inferring it from behaviour. Faith's loop needs this to be legible. */
  function summary() {
    var p = load();
    if (!p.updated) return 'Nothing stored yet.';
    var bits = [];
    bits.push('concerns: ' + (p.concerns.length ? p.concerns.join(', ') : '(none)'));
    bits.push('age: ' + (p.age_range || '(skipped)'));
    bits.push('tailoring: ' + (p.tailoring || '(skipped)'));
    bits.push('max nudges/day: ' + (p.max_nudges_per_day || '(unset)'));
    bits.push('min gap: ' + (p.min_gap_hours ? p.min_gap_hours + 'h' : '(unset)'));
    bits.push('saved: ' + p.updated);
    return bits.join('\n');
  }

  /* Concern ids -> the vocabulary used in api/exercises.json `concerns`.
     These two lists drifted historically, so the mapping is explicit rather
     than derived: an id with no match simply contributes nothing, which is
     better than silently matching the wrong exercises. */
  var CONCERN_TO_TAGS = {
    back_pain: ['back pain'], neck_tension: ['neck tension'],
    shoulder_tension: ['shoulder tension'], better_posture: ['better posture'],
    desk_recovery: ['desk work recovery'], joint_stiffness: ['joint stiffness'],
    hip_tightness: ['hip tightness'], ankle_mobility: ['ankle mobility'],
    balance: ['balance'], fall_prevention: ['fall prevention'],
    flexibility: ['flexibility'], better_sleep: ['better sleep'],
    more_energy: ['more energy'], stress_relief: ['stress relief'],
    breathing: ['breathing'], independence: ['independence'],
    keep_up: ['more energy'], core_strength: ['core strength'],
    wrist_hand: ['wrist & hand mobility', 'grip strength'],
    knee_health: ['knee health'], sitting_recovery: ['sitting recovery'],
    thoracic: ['upper back mobility'], pelvic_floor: ['pelvic floor'],
    jaw_tmj: ['jaw/tmj tension'], general_wellness: ['general wellness']
  };

  function tagsForConcerns(ids) {
    var out = [];
    (ids || []).forEach(function (id) {
      (CONCERN_TO_TAGS[id] || []).forEach(function (t) {
        if (out.indexOf(t) === -1) out.push(t);
      });
    });
    return out;
  }

  global.StretchPrefs = {
    SCHEMA: SCHEMA, KEY: KEY,
    load: load, save: save, clear: clear, isSet: isSet,
    summary: summary, tagsForConcerns: tagsForConcerns,
    CONCERN_TO_TAGS: CONCERN_TO_TAGS
  };
})(window);
