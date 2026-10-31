/* tv.js: the TV page (www.davyrockett.com/tv/). Shows whatever app David has open on his iPad while 📺 TV is on.
   The iPad's mirror.js sends a copy of its page; this draws it in a frame and, on each change, updates only
   what changed (so animations keep running and nothing flashes). Memory Lane and Song Party open as
   themselves, in their own TV mode. The resting screen ("Davy Rockett") shows when nothing is being shown.
   Old-style JavaScript on purpose: smart-TV browsers. */
(function () {
  'use strict';
  var me = Math.random().toString(36).slice(2, 10);
  // Old TV browsers can't unzip, so the TV says what it can read and the iPad sends it that way.
  var caps = (window.DecompressionStream && window.Blob && Blob.prototype.stream && window.Response) ? 'gz' : 'plain';
  var latest = { t: 0, id: '', n: 0 };
  var frame = null;                     // what's on screen: { el, kind: 'mirror' | 'own', key, scrolled }
  var next = null;                      // a frame still loading: { el, kind, key, msg }
  var beat = 0;

  var TV_CSS = 'html{scrollbar-width:none}::-webkit-scrollbar{display:none}*{cursor:none!important}' +
    'dialog[data-tv-modal]{position:fixed;top:0;bottom:0;left:0;right:0;margin:auto;z-index:2147483000;' +
    'box-shadow:0 0 0 100vmax rgba(0,0,0,.4)}' +
    // SOS Band's Perform screen sizes the chart page in pixels for the iPad: on the TV it fills the screen instead.
    '#pf-page{position:absolute;top:0;left:0;right:0;bottom:0;display:block}' +
    '#pf-page canvas[data-tv-img]{width:100%!important;height:100%!important;object-fit:contain;background:transparent}';

  function $(id) { return document.getElementById(id); }

  /* ---------- The resting screen ---------- */
  function rest(hint) {
    if (next) { next.el.parentNode.removeChild(next.el); next = null; }
    if (frame) { frame.el.parentNode.removeChild(frame.el); frame = null; }
    $('rest').style.display = '';
    $('hint').style.visibility = hint ? 'visible' : 'hidden';
  }

  /* ---------- Frames ---------- */
  function newFrame(kind, key) {
    if (next) next.el.parentNode.removeChild(next.el);
    var el = document.createElement('iframe');
    el.className = 'waiting';
    el.setAttribute('tabindex', '-1');
    el.setAttribute('aria-hidden', 'true');
    next = { el: el, kind: kind, key: key, msg: null, scrolled: [] };
    return next;
  }
  function swap(f) {
    if (frame && frame !== f) frame.el.parentNode.removeChild(frame.el);
    frame = f; next = null;
    f.el.className = '';
    $('rest').style.display = 'none';
  }

  // Memory Lane / Song Party: the app itself, in its own TV mode (it follows the iPad through its own link).
  function own(app, roleKey) {
    try { localStorage.setItem(roleKey, 'tv'); } catch (e) {}
    if (frame && frame.kind === 'own' && frame.key === app) return;
    if (next && next.kind === 'own' && next.key === app) return;
    var f = newFrame('own', app);
    f.el.onload = function () { if (next === f) swap(f); };
    f.el.src = '../' + app + '/';
    document.body.appendChild(f.el);
  }

  // Any other app: a copy of the iPad's page.
  function mirror(msg) {
    var key = msg.base + '\n' + msg.head;
    if (frame && frame.kind === 'mirror' && frame.key === key && !next) { patch(frame, msg); return; }
    if (next && next.kind === 'mirror' && next.key === key) { next.msg = msg; return; }
    var f = newFrame('mirror', key);
    f.msg = msg;
    var html = '<!doctype html><html><head><meta charset="utf-8"><base href="' + msg.base.replace(/"/g, '&quot;') + '">' +
      msg.head + '<style>' + TV_CSS + '</style></head><body></body></html>';
    var loaded = function () {
      if (next !== f) return;
      patch(f, f.msg);
      swap(f);
      setTimeout(function () { if (frame === f) scrollTo(f, f.msg); }, 400);   // once pictures and fonts have their sizes
    };
    document.body.appendChild(f.el);
    if ('srcdoc' in f.el) { f.el.onload = loaded; f.el.srcdoc = html; }
    else {
      var d = f.el.contentWindow.document;
      d.open(); d.write(html); d.close();
      setTimeout(loaded, 300);
    }
  }

  /* ---------- Updating only what changed ---------- */
  function sameNode(a, b) {
    return a.nodeType === b.nodeType && (a.nodeType !== 1 || (a.nodeName === b.nodeName && a.namespaceURI === b.namespaceURI));
  }
  function syncAttrs(a, list) {
    var want = {}, i;
    for (i = 0; i < list.length; i++) want[list[i][0]] = list[i][1];
    for (i = a.attributes.length - 1; i >= 0; i--) {
      var name = a.attributes[i].name;
      if (!want.hasOwnProperty(name)) a.removeAttribute(name);
    }
    for (var k in want) if (a.getAttribute(k) !== want[k]) a.setAttribute(k, want[k]);
  }
  function attrList(el) {
    var out = [];
    for (var i = 0; i < el.attributes.length; i++) out.push([el.attributes[i].name, el.attributes[i].value]);
    return out;
  }
  // Makes `a` look like `b` (b's nodes are moved into a where a has nothing to reuse).
  function morph(a, b) {
    syncAttrs(a, attrList(b));
    if (a.nodeName === 'INPUT') { if (b.hasAttribute('value')) a.value = b.getAttribute('value'); a.checked = b.hasAttribute('checked'); }
    if (a.nodeName === 'OPTION') a.selected = b.hasAttribute('selected');
    var ac = a.firstChild, bc = b.firstChild;
    while (bc) {
      var nb = bc.nextSibling;
      if (!ac) a.appendChild(bc);
      else if (sameNode(ac, bc)) {
        if (ac.nodeType === 1) morph(ac, bc);
        else if (ac.data !== bc.data) ac.data = bc.data;
        ac = ac.nextSibling;
      } else {
        var na = ac.nextSibling;
        a.replaceChild(bc, ac);
        ac = na;
      }
      bc = nb;
    }
    while (ac) { var gone = ac; ac = ac.nextSibling; a.removeChild(gone); }
  }
  function patch(f, msg) {
    var d = f.el.contentDocument;
    if (!d || !d.body) return;
    syncAttrs(d.documentElement, msg.ha || []);
    syncAttrs(d.body, msg.ba || []);
    var tmp = d.createElement('body');
    tmp.innerHTML = msg.b || '';
    morph(d.body, tmp);
    drawPics(f);
    scrollTo(f, msg);
  }
  function scrollTo(f, msg) {
    var d = f.el.contentDocument;
    if (!d || !d.body) return;
    var i, els = d.querySelectorAll('[data-tv-sc]');
    for (i = 0; i < f.scrolled.length; i++) {   // scrolled before, back at the top now
      if (!f.scrolled[i].hasAttribute('data-tv-sc')) { f.scrolled[i].scrollTop = 0; f.scrolled[i].scrollLeft = 0; }
    }
    f.scrolled = [];
    for (i = 0; i < els.length; i++) {
      var r = els[i].getAttribute('data-tv-sc').split(',');
      els[i].scrollTop = (+r[0] || 0) * (els[i].scrollHeight - els[i].clientHeight);
      els[i].scrollLeft = (+r[1] || 0) * (els[i].scrollWidth - els[i].clientWidth);
      f.scrolled.push(els[i]);
    }
    var se = d.scrollingElement || d.documentElement;
    se.scrollTop = (msg.ws || 0) * (se.scrollHeight - se.clientHeight);
  }

  /* ---------- Pictures (canvas drawings, e.g. SOS Band's chart pages) ----------
     They come on 'img' as "<key>\n" + a JPEG, and are drawn into each canvas marked data-tv-img="<key>".
     One that hasn't come yet is asked for on 'need'. */
  var pics = {}, picOrder = [], asked = {};
  function gotPic(bytes) {
    var i = 0, key = '';
    while (i < bytes.length && bytes[i] !== 10) key += String.fromCharCode(bytes[i++]);
    if (!key || pics[key]) return;
    var img = new Image();
    img.onload = function () {
      pics[key] = img;
      picOrder.push(key);
      while (picOrder.length > 60) delete pics[picOrder.shift()];
      URL.revokeObjectURL(img.src);
      drawPics(frame);
    };
    img.src = URL.createObjectURL(new Blob([bytes.subarray(i + 1)], { type: 'image/jpeg' }));
  }
  function drawPics(f) {
    if (!f || f.kind !== 'mirror') return;
    var d = f.el.contentDocument;
    if (!d) return;
    var cvs = d.querySelectorAll('canvas[data-tv-img]');
    for (var i = 0; i < cvs.length; i++) {
      var cv = cvs[i], key = cv.getAttribute('data-tv-img');
      if (cv.tvKey === key) continue;   // already showing this picture
      var img = pics[key];
      if (!img) {
        if (!asked[key] || Date.now() - asked[key] > 4000) { asked[key] = Date.now(); TVRelay.send('need', key, false); }
        continue;
      }
      try { cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); cv.tvKey = key; } catch (e) {}
    }
  }

  /* ---------- Messages from the iPad ---------- */
  function decode(bytes, done) {
    if (bytes.length > 1 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
      if (caps !== 'gz') return;   // sent zipped before this TV said it can't unzip; a plain copy follows
      new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text().then(done);
      return;
    }
    if (window.TextDecoder) { done(new TextDecoder().decode(bytes)); return; }
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    try { done(decodeURIComponent(escape(s))); } catch (e) {}
  }
  function receive(text, retained) {
    var msg;
    try { msg = JSON.parse(text); } catch (e) { return; }
    if (!msg || msg.k !== 'tv1') return;
    if (msg.t < latest.t || (msg.id === latest.id && msg.n <= latest.n)) return;   // older, or the same one through the other relay
    latest = { t: msg.t, id: msg.id, n: msg.n };
    // A screen left over from long ago (e.g. last week) isn't shown.
    if (retained && Math.abs(Date.now() - msg.t) > 30 * 60 * 1000) { rest(true); return; }
    if (msg.off) rest(true);
    else if (msg.idle) rest(false);
    else if (msg.own) own(msg.app, msg.own);
    else if (msg.b != null) mirror(msg);
  }

  /* ---------- Connecting ---------- */
  function sayOn(broker) { TVRelay.send('tv', 'on:' + me + ':' + caps, true, broker); }
  TVRelay.start({
    subs: ['state', 'img'],
    will: ['tv', 'off:' + me],
    onConnect: sayOn,
    onStatus: function () { $('dot').hidden = TVRelay.connected() > 0; },
    onMessage: function (suffix, bytes, retained) {
      if (suffix === 'state') decode(bytes, function (text) { receive(text, retained); });
      else if (suffix === 'img') gotPic(bytes);
    }
  });
  clearInterval(beat);
  beat = setInterval(function () { TVRelay.send('tv', 'on:' + me + ':' + caps, true); }, 20000);
  $('dot').hidden = false;
  rest(true);
})();
