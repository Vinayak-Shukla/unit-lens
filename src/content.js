// content.js — walks the page, converts measurements in text nodes, and keeps
// up with dynamically added content. Original text is preserved on hover and
// can be fully restored when the extension is toggled off.
(function () {
  "use strict";

  const UnitLens = window.UnitLens;
  if (!UnitLens) return;

  const MARK_CLASS = "unit-lens-converted";
  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT",
    "OPTION", "CODE", "PRE", "KBD", "SAMP",
  ]);

  let settings = null;
  let observer = null;
  let scheduled = false;
  const pending = new Set();

  injectStyle();

  // Load settings, then run. Re-run whenever settings change.
  chrome.storage.sync.get("unitLensSettings", (data) => {
    settings = mergeSettings(data.unitLensSettings);
    if (settings.enabled) start();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes.unitLensSettings) return;
    settings = mergeSettings(changes.unitLensSettings.newValue);
    restoreAll();
    if (settings.enabled) {
      start();
    } else {
      stop();
    }
  });

  function mergeSettings(stored) {
    const def = UnitLens.defaultSettings();
    if (!stored) return def;
    return {
      enabled: stored.enabled !== false,
      categories: Object.assign({}, def.categories, stored.categories),
      targets: Object.assign({}, def.targets, stored.targets),
    };
  }

  function start() {
    convertSubtree(document.body);
    if (!observer) {
      observer = new MutationObserver(onMutations);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  }

  function stop() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function onMutations(mutations) {
    for (const mut of mutations) {
      if (mut.type === "characterData") {
        if (mut.target.parentNode) pending.add(mut.target.parentNode);
      } else {
        mut.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            pending.add(node);
          }
        });
      }
    }
    if (pending.size && !scheduled) {
      scheduled = true;
      requestAnimationFrame(flushPending);
    }
  }

  function flushPending() {
    scheduled = false;
    const nodes = Array.from(pending);
    pending.clear();
    for (const node of nodes) {
      if (!node.isConnected) continue;
      if (node.nodeType === Node.TEXT_NODE) {
        convertTextNode(node);
      } else {
        convertSubtree(node);
      }
    }
  }

  // Avoid reacting to our own DOM edits.
  function withObserverPaused(fn) {
    if (observer) observer.disconnect();
    try {
      fn();
    } finally {
      if (settings && settings.enabled) {
        observer = observer || new MutationObserver(onMutations);
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      }
    }
  }

  function shouldSkip(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.classList && el.classList.contains(MARK_CLASS)) return true;
    return false;
  }

  function convertSubtree(root) {
    if (!root) return;
    const textNodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !/\d/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        let p = node.parentElement;
        while (p) {
          if (shouldSkip(p)) return NodeFilter.FILTER_REJECT;
          p = p.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n;
    while ((n = walker.nextNode())) textNodes.push(n);
    if (textNodes.length) {
      withObserverPaused(() => textNodes.forEach(replaceInTextNode));
    }
  }

  function convertTextNode(node) {
    if (node.nodeType !== Node.TEXT_NODE || !node.nodeValue || !/\d/.test(node.nodeValue)) return;
    let p = node.parentElement;
    while (p) {
      if (shouldSkip(p)) return;
      p = p.parentElement;
    }
    withObserverPaused(() => replaceInTextNode(node));
  }

  function replaceInTextNode(node) {
    if (!node.parentNode || !node.nodeValue) return;
    const text = node.nodeValue;
    const matches = UnitLens.scan(text, settings);
    if (!matches.length) return;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const m of matches) {
      if (m.start < cursor) continue;
      if (m.start > cursor) {
        frag.appendChild(document.createTextNode(text.slice(cursor, m.start)));
      }
      const span = document.createElement("span");
      span.className = MARK_CLASS;
      span.textContent = m.converted;
      span.title = "Original: " + m.original.trim();
      span.dataset.unitLensOriginal = m.original;
      frag.appendChild(span);
      cursor = m.end;
    }
    if (cursor < text.length) {
      frag.appendChild(document.createTextNode(text.slice(cursor)));
    }
    node.parentNode.replaceChild(frag, node);
  }

  // Undo every conversion by swapping our spans back to their original text.
  function restoreAll() {
    const spans = document.querySelectorAll("span." + MARK_CLASS);
    if (!spans.length) return;
    withObserverPaused(() => {
      spans.forEach((span) => {
        const original = span.dataset.unitLensOriginal || span.textContent;
        span.parentNode.replaceChild(document.createTextNode(original), span);
      });
    });
  }

  function injectStyle() {
    const style = document.createElement("style");
    style.textContent =
      "span." + MARK_CLASS + "{" +
      "border-bottom:1px dotted currentColor;" +
      "cursor:help;" +
      "}";
    (document.head || document.documentElement).appendChild(style);
  }
})();
