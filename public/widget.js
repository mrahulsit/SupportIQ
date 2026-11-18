/*!
 * SupportIQ embed loader
 * <script src="https://YOUR-SUPPORTIQ-HOST/widget.js" data-bot="BOT_PUBLIC_KEY" async></script>
 *
 * Adds a floating chat button. The chat itself runs in an iframe on the
 * SupportIQ origin, so its CSS/JS never collide with the host page.
 */
(function () {
  "use strict";
  if (window.__supportiqLoaded) return;
  window.__supportiqLoaded = true;

  var script =
    document.currentScript || document.querySelector('script[src*="widget.js"][data-bot]');
  if (!script) return;
  var key = script.getAttribute("data-bot");
  if (!key) return console.warn("[SupportIQ] missing data-bot attribute");

  var origin = new URL(script.src, location.href).origin;
  var position = script.getAttribute("data-position") === "left" ? "left" : "right";
  var color = script.getAttribute("data-color") || "#4f46e5";
  var open = false;
  var frame = null;
  var unread = 0;

  var css =
    "#siq-root,#siq-root *{box-sizing:border-box}" +
    "#siq-launcher{position:fixed;bottom:20px;" + position + ":20px;z-index:2147483646;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;" +
    "display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 8px 24px rgba(15,23,42,.25);transition:transform .2s ease}" +
    "#siq-launcher:hover{transform:scale(1.06)}#siq-launcher:focus-visible{outline:3px solid #93c5fd;outline-offset:2px}" +
    "#siq-launcher svg{width:26px;height:26px}" +
    "#siq-badge{position:absolute;top:-2px;right:-2px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#ef4444;color:#fff;font:600 11px/20px system-ui,sans-serif;display:none}" +
    "#siq-panel{position:fixed;bottom:88px;" + position + ":20px;z-index:2147483647;width:384px;height:min(620px,calc(100vh - 110px));border-radius:16px;overflow:hidden;" +
    "box-shadow:0 20px 50px rgba(15,23,42,.28);background:#fff;opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .18s ease,transform .18s ease}" +
    "#siq-panel.siq-open{opacity:1;transform:none;pointer-events:auto}" +
    "#siq-panel iframe{width:100%;height:100%;border:0;display:block}" +
    "@media (max-width:480px){#siq-panel{inset:0;width:100%;height:100%;border-radius:0;bottom:0;" + position + ":0}#siq-panel.siq-open + #siq-launcher{display:none}}";

  var chatIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var closeIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  function mount() {
    var style = document.createElement("style");
    style.id = "siq-style";
    style.textContent = css;
    document.head.appendChild(style);

    var root = document.createElement("div");
    root.id = "siq-root";

    var panel = document.createElement("div");
    panel.id = "siq-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Support chat");

    var button = document.createElement("button");
    button.id = "siq-launcher";
    button.type = "button";
    button.setAttribute("aria-label", "Open support chat");
    button.style.background = color;
    button.innerHTML = chatIcon + '<span id="siq-badge"></span>';

    root.appendChild(panel);
    root.appendChild(button);
    document.body.appendChild(root);

    function setBadge(n) {
      unread = n;
      var badge = document.getElementById("siq-badge");
      if (!badge) return;
      badge.textContent = String(n);
      badge.style.display = n > 0 ? "block" : "none";
    }

    function toggle(next) {
      open = typeof next === "boolean" ? next : !open;
      if (open && !frame) {
        // Lazy-load the iframe on first open to keep the host page fast.
        frame = document.createElement("iframe");
        frame.title = "Support chat";
        frame.allow = "clipboard-write";
        frame.src = origin + "/embed/" + encodeURIComponent(key) + "?page=" + encodeURIComponent(location.href);
        panel.appendChild(frame);
      }
      panel.classList.toggle("siq-open", open);
      button.innerHTML = (open ? closeIcon : chatIcon) + '<span id="siq-badge"></span>';
      button.setAttribute("aria-label", open ? "Close support chat" : "Open support chat");
      if (open) setBadge(0);
      else setBadge(unread);
      if (frame && frame.contentWindow) frame.contentWindow.postMessage({ type: open ? "siq:open" : "siq:closed" }, origin);
    }

    button.addEventListener("click", function () {
      toggle();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && open) toggle(false);
    });

    window.addEventListener("message", function (e) {
      // Only trust messages coming from the SupportIQ iframe.
      if (e.origin !== origin || !frame || e.source !== frame.contentWindow) return;
      var data = e.data || {};
      if (data.type === "siq:close") toggle(false);
      if (data.type === "siq:ready") frame.contentWindow.postMessage({ type: open ? "siq:open" : "siq:closed" }, origin);
      if (data.type === "siq:unread" && !open) setBadge(unread + (data.count || 1));
    });

    // Pick up the bot's brand colour (unless overridden with data-color).
    if (!script.getAttribute("data-color")) {
      fetch(origin + "/api/widget/" + encodeURIComponent(key) + "/config")
        .then(function (r) {
          return r.ok ? r.json() : null;
        })
        .then(function (cfg) {
          if (cfg && cfg.brandColor) button.style.background = cfg.brandColor;
        })
        .catch(function () {});
    }

    window.SupportIQ = { open: function () { toggle(true); }, close: function () { toggle(false); }, toggle: toggle };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
