/* relay.js: the messenger behind the one TV address (www.davyrockett.com/tv/). Used by the TV page and by
   mirror.js, which every app on David's iPad loads while 📺 TV is on.

   It connects to two free public MQTT relays at once (EMQX and HiveMQ, no account) and sends every message
   through both, so the link still works when one of them is down or blocked on the TV's Wi-Fi.
   Everything travels under one fixed link name, "dr", so there's nothing to type. A test uses its own name:
   ?link=… in the TV page's address, or localStorage 'davyrockett-tv-link' on the remote.
   Old-style JavaScript on purpose: the TV page runs on smart-TV browsers. */
var TVRelay = (function () {
  'use strict';
  var BROKERS = [
    { host: 'broker.emqx.io', port: 8084, path: '/mqtt' },
    { host: 'broker.hivemq.com', port: 8884, path: '/mqtt' }
  ];
  var conns = [];
  var opts = null;

  function code() {
    var m = /[?&]link=([\w-]+)/.exec(location.search);
    if (m) return m[1];
    try { return localStorage.getItem('davyrockett-tv-link') || 'dr'; } catch (e) { return 'dr'; }
  }
  function topic(suffix) { return 'davyrockett-tv/' + code() + '/' + suffix; }
  function message(suffix, payload, retained) {
    var m = new Paho.Message(payload);
    m.destinationName = topic(suffix);
    m.retained = !!retained;
    return m;
  }

  function connect(i) {
    var c = conns[i], b = BROKERS[i];
    clearTimeout(c.timer);
    c.connecting = true;
    var client = new Paho.Client(b.host, b.port, b.path, 'dtv-' + Math.random().toString(36).slice(2, 10));
    c.client = client;
    client.onMessageArrived = function (m) {
      var suffix = m.destinationName.slice(topic('').length);
      opts.onMessage(suffix, m.payloadBytes, m.retained, i);
    };
    client.onConnectionLost = function () {
      if (c.client !== client) return;
      c.on = false; status(); retry(i);
    };
    var o = {
      useSSL: true, timeout: 6, keepAliveInterval: 20, cleanSession: true,
      onSuccess: function () {
        if (c.client !== client) { try { client.disconnect(); } catch (e) {} return; }
        c.on = true; c.fails = 0; c.connecting = false;
        for (var s = 0; s < opts.subs.length; s++) client.subscribe(topic(opts.subs[s]));
        status();
        if (opts.onConnect) opts.onConnect(i);
      },
      onFailure: function () {
        if (c.client !== client) return;
        c.on = false; c.connecting = false; status(); retry(i);
      }
    };
    if (opts.will) o.willMessage = message(opts.will[0], opts.will[1], true);   // the relay says this if we drop off
    try { client.connect(o); } catch (e) { retry(i); }
  }
  function retry(i) {
    var c = conns[i];
    c.connecting = false;
    c.fails++;
    clearTimeout(c.timer);
    c.timer = setTimeout(function () { connect(i); }, Math.min(30000, 3000 * c.fails));   // less often if it keeps failing
  }
  function status() { if (opts && opts.onStatus) opts.onStatus(); }

  return {
    code: code,
    // opts: { subs: ['state'], onMessage(suffix, bytes, retained, broker), onConnect(broker), onStatus(), will: [suffix, text] }
    start: function (o) {
      opts = o;
      for (var i = 0; i < BROKERS.length; i++) {
        conns[i] = { client: null, on: false, connecting: false, fails: 0, timer: 0 };
        connect(i);
      }
      // Reconnect quickly when the screen wakes up or the Wi-Fi comes back.
      var again = function () {
        for (var j = 0; j < conns.length; j++) if (!conns[j].on && !conns[j].connecting) connect(j);
      };
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') again(); });
      window.addEventListener('online', again);
    },
    // Sends through every relay that's connected (or just one, with `only`). Payload: text or Uint8Array.
    send: function (suffix, payload, retained, only) {
      for (var i = 0; i < conns.length; i++) {
        if (!conns[i].on || (only != null && only !== i)) continue;
        try { conns[i].client.send(message(suffix, payload, retained)); } catch (e) {}
      }
    },
    connected: function () {
      var n = 0;
      for (var i = 0; i < conns.length; i++) if (conns[i].on) n++;
      return n;
    }
  };
})();
