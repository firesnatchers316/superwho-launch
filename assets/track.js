/**
 * SuperWho page-open tracker.
 * Content-free beacon only: page slug, time, referrer domain,
 * coarse device type, and a test flag. No names, messages, or keys.
 *
 * Usage: set window.SW_TRACK = { page: "brice", slug: "bid-loop-preview-…" }
 *        then load this file. Mark test opens with ?test=1 (or ?selftest=1).
 */
(function () {
  var cfg = window.SW_TRACK || {};
  var URL = cfg.url || "https://script.google.com/macros/s/AKfycbxfpzhcEMOe9N7ZnR9-9wCls10IWkyVtjQ9-1z72g52Df_Pl9gvCYppLCsIUO6EsVqb/exec";
  var PAGE = cfg.page || "";
  var SLUG = cfg.slug || "";
  var lastSent = 0;
  var DEBOUNCE_MS = 30000;

  function isTest() {
    try {
      var q = new URLSearchParams(location.search);
      if (q.get("test") === "1" || q.get("selftest") === "1") return true;
    } catch (e) {}
    try {
      if (localStorage.getItem("sw_track_test") === "1") return true;
    } catch (e) {}
    var h = location.hostname || "";
    if (h === "localhost" || h === "127.0.0.1") return true;
    return false;
  }

  function deviceId() {
    var id = "";
    try { id = localStorage.getItem("swDeviceId") || ""; } catch (e) {}
    if (!id) {
      if (window.crypto && crypto.randomUUID) id = crypto.randomUUID();
      else id = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
      try { localStorage.setItem("swDeviceId", id); } catch (e) {}
    }
    return id;
  }

  function deviceType() {
    var ua = navigator.userAgent || "";
    if (/iPad|Tablet|PlayBook/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) return "tablet";
    if (/Mobi|iPhone|iPod|Android.+Mobile/.test(ua)) return "phone";
    return "desktop";
  }

  function uaFamily() {
    var ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/.test(ua)) {
      if (/CriOS/.test(ua)) return "Chrome iOS";
      if (/FxiOS/.test(ua)) return "Firefox iOS";
      return "Safari iOS";
    }
    if (/Android/.test(ua)) {
      if (/Chrome/.test(ua)) return "Chrome Android";
      if (/Firefox/.test(ua)) return "Firefox Android";
      return "Android";
    }
    if (/Mac OS X/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) return "Safari macOS";
    if (/Edg/.test(ua)) return "Edge";
    if (/Chrome|Chromium/.test(ua)) return "Chrome";
    if (/Firefox/.test(ua)) return "Firefox";
    return "Other";
  }

  function referrerDomain() {
    try {
      if (!document.referrer) return "";
      var u = new URL(document.referrer);
      if (u.hostname === location.hostname) return "";
      return String(u.hostname || "").slice(0, 80);
    } catch (e) {
      return "";
    }
  }

  function sendOpen() {
    if (!URL || !PAGE) return;
    var now = Date.now();
    if (lastSent && now - lastSent < DEBOUNCE_MS) return;
    lastSent = now;
    var test = isTest();
    var slug = SLUG;
    if (test && slug && slug.indexOf("__test") === -1 && slug.indexOf("__selftest") === -1) {
      slug = slug + "__test";
    } else if (test && !slug) {
      slug = "test";
    }
    var body = JSON.stringify({
      action: "open",
      page: PAGE,
      slug: slug,
      event: "open",
      time: new Date().toISOString(),
      device: deviceId(),
      ua: uaFamily(),
      deviceType: deviceType(),
      referrer: referrerDomain(),
      test: test
    });
    try {
      var blob = new Blob([body], { type: "text/plain;charset=utf-8" });
      if (navigator.sendBeacon && navigator.sendBeacon(URL, blob)) return;
    } catch (e) {}
    try {
      fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: body,
        keepalive: true,
        mode: "no-cors",
        credentials: "omit"
      }).catch(function () {});
    } catch (e) {}
  }

  function boot() {
    sendOpen();
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") sendOpen();
    });
    window.addEventListener("pageshow", function (ev) {
      if (ev.persisted) sendOpen();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  /**
   * Send a Talk-to message through the same engagement receiver
   * already used for page-open beacons. No additional URL or key.
   * Returns a promise of { ok, id, test, status } when readable.
   */
  window.swTrack = function (event) {
    if (!URL || !PAGE) return Promise.resolve({ ok: false, skipped: true });
    var name = String(event || "").toLowerCase().trim();
    if (!name || name === "open") return Promise.resolve({ ok: false, skipped: true });
    var test = isTest();
    var body = JSON.stringify({
      action: "track",
      page: PAGE,
      slug: slug(),
      event: name,
      time: new Date().toISOString(),
      device: deviceId(),
      ua: uaFamily(),
      deviceType: deviceType(),
      referrer: referrerHost(),
      test: test
    });
    return fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: body,
      credentials: "omit",
      redirect: "follow"
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (j && j.ok) return j;
        if (!r.ok) throw new Error((j && j.error) || "track failed");
        return j && Object.keys(j).length ? j : { ok: true, test: test };
      });
    });
  };

  window.swTalk = function (opts) {
    opts = opts || {};
    var text = String(opts.text || "").trim();
    var page = String((opts.page || PAGE || "")).toLowerCase().trim();
    if (!URL || !page || !text) {
      return Promise.reject(new Error("missing"));
    }
    var test = isTest();
    if (opts.test === true) test = true;
    var body = JSON.stringify({
      action: "talk",
      page: page,
      slug: SLUG || "",
      from: String(opts.from || "").trim(),
      text: text.slice(0, 4000),
      sentAt: new Date().toISOString(),
      device: deviceId(),
      ua: uaFamily(),
      deviceType: deviceType(),
      test: test
    });
    return fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: body,
      credentials: "omit",
      redirect: "follow"
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (j && j.ok) return j;
        if (!r.ok) throw new Error((j && j.error) || "send failed");
        return j && Object.keys(j).length ? j : { ok: true, test: test };
      });
    });
  };
})();
