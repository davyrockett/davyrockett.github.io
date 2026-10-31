/* mirror.js: shows what's on this device on the TV (www.davyrockett.com/tv/).
   suite.js loads it in every app while 📺 TV is on (localStorage 'davyrockett-tv' = '1', switched on the Apps
   screen). It sends a copy of the page (its visible HTML and styles, never its scripts) whenever something
   changes, and the TV page draws that copy. The TV only watches: everything is still done on this device,
   and sounds play here.

   Exceptions:
   - Memory Lane and Song Party have their own TV link (words on the TV, charts on the iPad), so this only tells
     the TV to open that app as its TV screen, and turns this device into its remote.
   - The Apps screen, Rundown, Health Log and Z4 Log are private: the TV shows its resting screen instead.
   - Typed text (access keys…) is never copied.
   Canvas drawings (SOS Band's chart pages) are sent as pictures, each one once, on their own (see "Pictures"). */
(function () {
  'use strict';
  if (window.TVMirror || window.top !== window) return;

  var app = location.pathname.split('/')[1] || 'website';
  var OWN = { 'memory-lane': 'ml.link-role', 'song-party': 'sp.link-role' };
  var IDLE = { apps: 1, rundown: 1, 'health-log': 1, 'z4-log': 1 };
  var SKIP_IDS = { 'suite-home': 1, 'tv-pill': 1 };
  var ROOT = '/tv/';

  var me = Math.random().toString(36).slice(2, 10);
  var seq = 0;
  var on = true;
  var tv = { online: false, plain: false, ids: {} };   // per relay: the TV that last said "on"
  var last = '';
  var timer = 0, nextAt = 0;
  var used = [];   // pictures in the copy being made
  // When this page was last touched (click, key, scroll, or switched to). Several pages can have 📺 TV on at once
  // (another Safari tab, the iPad): the TV follows the one touched last. A page opened in the background starts at 0.
  var act = document.hasFocus && document.hasFocus() ? Date.now() : 0;
  var forceNext = false;

  /* ---------- A copy of the page ---------- */
  function attrs(el) {
    var out = [];
    for (var i = 0; i < el.attributes.length; i++) out.push([el.attributes[i].name, el.attributes[i].value]);
    return out;
  }
  function ratio(el) {
    var v = el.scrollHeight - el.clientHeight, h = el.scrollWidth - el.clientWidth;
    return [v > 0 ? Math.round(el.scrollTop / v * 1000) / 1000 : 0, h > 0 ? Math.round(el.scrollLeft / h * 1000) / 1000 : 0];
  }
  // Copies an element, leaving out scripts and the insides of anything hidden (they don't show anyway, and
  // would make the copy far bigger), and writes down what HTML alone doesn't hold: scroll places, sliders, ticks.
  function copy(src) {
    var c = src.cloneNode(false);
    if (src.scrollTop > 0 || src.scrollLeft > 0) c.setAttribute('data-tv-sc', ratio(src).join(','));
    var tag = src.tagName;
    if (tag === 'INPUT') {
      var t = src.type;
      if (t === 'checkbox' || t === 'radio') { if (src.checked) c.setAttribute('checked', ''); else c.removeAttribute('checked'); }
      else if (t === 'range' || t === 'number' || t === 'color') c.setAttribute('value', src.value);
      else c.removeAttribute('value');   // typed text can be an access key: never sent
      return c;
    }
    if (tag === 'OPTION') { if (src.selected) c.setAttribute('selected', ''); else c.removeAttribute('selected'); }
    if (tag === 'CANVAS') {
      var key = picKey(src);
      if (key) { c.setAttribute('data-tv-img', key); used.push(key); }
      return c;
    }
    if (tag === 'TEXTAREA') return c;
    if (tag === 'DIALOG') { try { if (src.matches(':modal')) c.setAttribute('data-tv-modal', ''); } catch (e) {} }
    for (var k = src.firstChild; k; k = k.nextSibling) {
      if (k.nodeType === 3) { c.appendChild(k.cloneNode(false)); continue; }
      if (k.nodeType !== 1) continue;
      var name = k.tagName;
      if (name === 'SCRIPT' || name === 'NOSCRIPT' || name === 'TEMPLATE' || SKIP_IDS[k.id]) continue;
      if (k.hidden || getComputedStyle(k).display === 'none') { c.appendChild(k.cloneNode(false)); continue; }
      c.appendChild(copy(k));
    }
    return c;
  }
  function headCopy() {
    var out = '';
    var els = document.head.querySelectorAll('style, link[rel~="stylesheet"]');
    for (var i = 0; i < els.length; i++) out += els[i].outerHTML;
    return out;
  }
  function snapshot() {
    var s = { k: 'tv1', id: me, n: 0, t: 0, app: app };
    if (!on) s.off = 1;
    else if (OWN[app]) { s.own = OWN[app]; }
    else if (IDLE[app]) { s.idle = 1; }
    else {
      s.base = location.href.split('#')[0].replace(/[^\/]*$/, '');
      s.head = headCopy();
      s.ha = attrs(document.documentElement);
      s.ba = attrs(document.body);
      s.b = copy(document.body).innerHTML;
      s.ws = ratio(document.scrollingElement || document.documentElement)[0];
      s.z = size();
    }
    return s;
  }

  /* ---------- Pictures ----------
     A canvas (SOS Band draws each chart page on one, already finished when it's put on the page) becomes a JPEG
     the first time it's seen, and goes to the TV by itself on 'img' ("<key>\n" + the JPEG), once per TV. The page
     copy only marks the canvas with data-tv-img="<key>", so scrolling a chart sends just the small copy.
     The TV asks again on 'need' for any it missed. A canvas drawn on again later at the same size isn't re-sent. */
  var pics = { byCanvas: window.WeakMap ? new WeakMap() : null, data: {}, order: [], sent: {}, n: 0 };
  function picKey(cv) {
    if (!pics.byCanvas || !cv.width || !cv.height) return '';
    var p = pics.byCanvas.get(cv);
    if (p && p.w === cv.width && p.h === cv.height) return p.key;   // '' while it's being made
    p = { w: cv.width, h: cv.height, key: '' };
    pics.byCanvas.set(cv, p);
    capture(cv, p);
    return '';
  }
  function capture(cv, p) {
    var w = Math.min(1400, cv.width), h = Math.max(1, Math.round(cv.height * w / cv.width));
    var out = document.createElement('canvas');
    out.width = w; out.height = h;
    try {
      var ctx = out.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(cv, 0, 0, w, h);
      out.toBlob(function (blob) {
        if (!blob) return;
        blob.arrayBuffer().then(function (buf) {
          var key = me + '-' + (++pics.n);
          pics.data[key] = new Uint8Array(buf);
          pics.order.push(key);
          while (pics.order.length > 40) delete pics.data[pics.order.shift()];
          p.key = key;
          changed();
        });
      }, 'image/jpeg', 0.8);
    } catch (e) { /* a drawing with pictures from another site can't be read */ }
  }
  function sendPic(key) {
    var d = pics.data[key];
    if (!d) return;
    var head = key + '\n', out = new Uint8Array(head.length + d.length);
    for (var i = 0; i < head.length; i++) out[i] = head.charCodeAt(i);
    out.set(d, head.length);
    TVRelay.send('img', out, false);
    pics.sent[key] = 1;
  }

  /* ---------- Sending ---------- */
  function gzip(text) {
    return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()
      .then(function (b) { return new Uint8Array(b); });
  }
  function send(force) {
    timer = 0;
    if (!TVRelay.connected()) return;
    used = [];
    pill();   // Read's − / + grey out as soon as Read shows
    var s = snapshot();
    for (var i = 0; i < used.length; i++) if (!pics.sent[used[i]]) sendPic(used[i]);   // pictures first
    var key = JSON.stringify(s);
    if (!force && !forceNext && key === last) return;
    last = key; forceNext = false;
    s.n = ++seq; s.t = Date.now(); s.a = act;
    var text = JSON.stringify(s);
    var ready = (window.CompressionStream && !tv.plain) ? gzip(text) : Promise.resolve(text);
    ready.then(function (payload) {
      TVRelay.send('state', payload, true);   // kept by the relay, so a TV that joins later catches up
      // Big copies (Jam Session's pictures) wait a little longer before the next one.
      nextAt = Date.now() + 200 + Math.round((payload.length || 0) / 100);
    });
  }
  // Touched: this page takes the TV back (sent even if nothing on it changed).
  function activity() {
    act = Date.now();
    forceNext = true;
    changed();
  }
  function changed() {
    if (timer || !on) return;
    timer = setTimeout(send, Math.max(120, nextAt - Date.now()));
  }

  /* ---------- The TV's "on"/"off" ---------- */
  function presence(text, broker) {
    var p = String(text).split(':');   // on:<id>:<gz|plain>  or  off:<id>
    var was = tv.online, wasPlain = tv.plain;
    if (p[0] === 'on') tv.ids[broker] = { id: p[1], plain: p[2] === 'plain' };
    else if (p[0] === 'off' && tv.ids[broker] && tv.ids[broker].id === p[1]) delete tv.ids[broker];
    tv.online = false; tv.plain = false;
    for (var b in tv.ids) { tv.online = true; if (tv.ids[b].plain) tv.plain = true; }
    if (tv.online && !was) pics.sent = {};
    if (tv.online && (!was || tv.plain !== wasPlain)) send(true);   // a TV just joined: show it this screen now
    pill();
  }

  /* ---------- Size on the TV ----------
     − / + on the "On TV" button make the TV's copy smaller or bigger. Remembered on this device for each app and
     each part of it (Page Fright's #read, #improv…), so Read can stay big while Jam Session stays normal. */
  var SIZES = [0.6, 0.7, 0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5, 3];
  var sizeShown = 0;
  function sizeKey() { return 'davyrockett-tv-size:' + app + ':' + ((/^#\/?([\w-]*)/.exec(location.hash) || [])[1] || ''); }
  function size() {
    var v = 0;
    try { v = parseFloat(localStorage.getItem(sizeKey())); } catch (e) {}
    return v > 0 ? v : 1;
  }
  function resize(d) {
    var z = size(), i = 0;
    while (i < SIZES.length - 1 && SIZES[i] < z - 0.001) i++;
    i = Math.max(0, Math.min(SIZES.length - 1, i + d));
    try { localStorage.setItem(sizeKey(), String(SIZES[i])); } catch (e) {}
    sizeShown = Date.now();
    pill();
    setTimeout(pill, 1600);   // back to "On TV" after a moment
    changed();
  }

  function readShown() {
    var r = app === 'page-fright' && document.getElementById('read-view');
    return !!r && r.getClientRects().length > 0;
  }

  /* ---------- On screen: "On TV" (tap to stop) with − / + beside it ---------- */
  function pill() {
    var toggle = document.getElementById('tv-toggle');   // the Apps screen has its own switch
    var p = document.getElementById('tv-pill');
    var ok = on && TVRelay.connected() > 0 && tv.online;
    try { document.dispatchEvent(new CustomEvent('tvstatus', { detail: { on: on, tv: ok } })); } catch (e) {}
    if (toggle || !on) { if (p) p.remove(); return; }
    // Greyed out where the TV doesn't show a copy of this page, and in Page Fright's Read, which always fits the
    // whole exercise on the TV.
    var sizable = !OWN[app] && !IDLE[app] && !readShown();
    if (!p) {
      p = document.createElement('div');
      p.id = 'tv-pill';
      var left = document.getElementById('suite-home') ? 64 : 12;   // beside the "All apps" button
      p.style.cssText = 'position:fixed;z-index:2147483646;left:calc(' + left + 'px + env(safe-area-inset-left,0px));' +
        'bottom:calc(12px + env(safe-area-inset-bottom,0px));height:44px;border-radius:22px;display:flex;align-items:stretch;' +
        'background:rgba(30,27,24,.78);color:#fff;font:600 15px/1 system-ui,sans-serif;overflow:hidden;' +
        'box-shadow:0 4px 14px rgba(0,0,0,.28);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);' +
        'border:1px solid rgba(255,255,255,.45);opacity:.92';
      var btn = 'background:none;border:0;color:inherit;font:inherit;cursor:pointer;display:flex;align-items:center;';
      p.innerHTML = '<button type="button" data-tv="main" style="' + btn + 'gap:7px;padding:0 12px 0 14px;min-width:7.4em"></button>' +
        '<button type="button" data-tv="-1" aria-label="Smaller on the TV" style="' + btn + 'padding:0 13px;font-size:22px;border-left:1px solid rgba(255,255,255,.3)">−</button>' +
        '<button type="button" data-tv="1" aria-label="Bigger on the TV" style="' + btn + 'padding:0 14px 0 13px;font-size:22px;border-left:1px solid rgba(255,255,255,.3)">+</button>';
      p.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('button') : null;
        if (!b || b.disabled) return;
        var what = b.getAttribute('data-tv');
        if (what === 'main') { if (confirm('Stop showing this on the TV?')) stop(); }
        else resize(+what);
      });
      document.body.appendChild(p);
    }
    var main = p.querySelector('[data-tv="main"]');
    var showSize = sizable && Date.now() - sizeShown < 1500;
    // Only touched when something differs (it's checked on every send, and a change here is a change on the page).
    var html = '<span style="width:9px;height:9px;border-radius:50%;background:' + (ok ? '#3BB273' : '#A3A3A3') + '"></span>' +
      (showSize ? 'Size ' + Math.round(size() * 100) + '%' : ok ? 'On TV' : 'No TV yet');
    if (main.tvHtml !== html) { main.innerHTML = html; main.tvHtml = html; }
    var label = ok ? 'Showing on the TV. Tap to stop.' : 'Waiting for the TV. Tap to stop.';
    if (main.getAttribute('aria-label') !== label) main.setAttribute('aria-label', label);
    var bs = p.querySelectorAll('[data-tv="-1"], [data-tv="1"]');
    for (var i = 0; i < bs.length; i++) {
      if (bs[i].disabled === !sizable) continue;
      bs[i].disabled = !sizable; bs[i].style.opacity = sizable ? '1' : '.35';
    }
  }

  function stop() {
    on = false;
    act = Date.now();
    try { localStorage.removeItem('davyrockett-tv'); } catch (e) {}
    send(true);   // the TV goes back to its resting screen
    if (OWN[app] && typeof linkStop === 'function') linkStop();
    pill();
  }

  function resume() {
    on = true;
    act = Date.now();
    try { localStorage.setItem('davyrockett-tv', '1'); } catch (e) {}
    send(true);
    pill();
  }

  /* ---------- Start ---------- */
  function load(src, done) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = done;
    document.head.appendChild(s);
  }
  function start() {
    // Memory Lane / Song Party: this device becomes their remote (their own link does the rest).
    if (OWN[app] && typeof linkStart === 'function' && typeof link !== 'undefined' && link.role !== 'remote') linkStart('remote');
    TVRelay.start({
      subs: ['state', 'tv', 'need'],
      onConnect: function () { changed(); },
      onStatus: pill,
      onMessage: function (suffix, bytes, retained, broker) {
        var text = '';
        for (var i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
        if (suffix === 'tv') presence(text, broker);
        else if (suffix === 'need') sendPic(text);   // the TV missed a picture
      }
    });
    if (window.MutationObserver) {
      new MutationObserver(changed).observe(document.documentElement,
        { subtree: true, childList: true, attributes: true, characterData: true });
    }
    document.addEventListener('scroll', changed, true);
    document.addEventListener('input', changed, true);
    document.addEventListener('change', changed, true);
    window.addEventListener('resize', changed);
    window.addEventListener('hashchange', function () { changed(); setTimeout(pill, 50); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') send(true); });
    ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(function (ev) {
      document.addEventListener(ev, activity, { capture: true, passive: true });
    });
    window.addEventListener('focus', activity);
    pill();
  }

  window.TVMirror = { stop: stop, resume: resume, isOn: function () { return on; } };
  var go = function () { load(ROOT + 'relay.js', start); };
  var boot = function () { if (typeof Paho === 'undefined') load(ROOT + 'paho-mqtt.min.js', go); else go(); };
  // Starts once the app's own scripts have run (Memory Lane's link and its copy of the MQTT library).
  if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);
})();
