// Runs inside the page. Returns the complete page state as plain JSON.
(() => {
  if (!document.body) return null;

  const visible = (e) =>
    !e.closest('[aria-hidden="true"],[inert]') &&
    e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });

  // Accessible name, the way a screen reader would announce the element.
  const name = (e, seen = new Set()) => {
    if (!e || seen.has(e)) return "";
    seen.add(e);
    const referenced = (e.getAttribute("aria-labelledby") || "")
      .split(/\s+/)
      .map((id) => name(document.getElementById(id), seen))
      .filter(Boolean)
      .join(" ");
    return (
      referenced ||
      e.getAttribute("aria-label") ||
      [...(e.labels || [])].map((l) => name(l, seen)).filter(Boolean).join(" ") ||
      (["button", "submit", "reset"].includes(e.type) ? e.value : "") ||
      e.getAttribute("alt") ||
      (e.tagName === "INPUT"
        ? ""
        : [...e.childNodes]
            .map((n) =>
              n.nodeType === 3
                ? n.textContent
                : n.nodeType === 1 && n.getAttribute("aria-hidden") !== "true"
                  ? name(n, seen)
                  : "",
            )
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()) ||
      e.getAttribute("title") ||
      e.getAttribute("placeholder") ||
      ""
    );
  };

  const roles = ["button", "link", "checkbox", "radio", "switch", "tab", "menuitem", "menuitemradio",
    "menuitemcheckbox", "option", "gridcell", "combobox", "textbox", "searchbox", "spinbutton", "slider"];
  const selector = 'a[href],button,input,textarea,select,summary,[contenteditable="true"],' +
    roles.map((r) => `[role="${r}"]`).join(",");

  // Custom controls: a <div>/<li>/<span> with a click handler. A pointer cursor marks the outermost
  // node of a clickable region (its parent is not also a pointer), so each region is listed once.
  const pointer = (e) => !!e && getComputedStyle(e).cursor === "pointer";
  const clickable = (e) =>
    e.hasAttribute("onclick") ||
    (e.hasAttribute("tabindex") && e.tabIndex >= 0 && !!e.innerText?.trim()) ||
    (pointer(e) && !pointer(e.parentElement));

  const role = (e) => {
    const explicit = e.getAttribute("role");
    if (roles.includes(explicit)) return explicit;
    const tag = e.tagName;
    if (tag === "BUTTON" || tag === "SUMMARY") return "button";
    if (tag === "A") return "link";
    if (tag === "SELECT") return "combobox";
    if (tag === "TEXTAREA" || e.isContentEditable) return "textbox";
    if (tag === "INPUT") {
      if (["checkbox", "radio"].includes(e.type)) return e.type;
      if (["button", "submit", "reset", "image"].includes(e.type)) return "button";
      if (e.type === "search") return "searchbox";
      if (e.type === "number") return "spinbutton";
      if (e.type === "range") return "slider";
      return "textbox";
    }
    return "button"; // a custom clickable
  };

  const custom = [...document.body.querySelectorAll(
    "div,span,li,label,p,img,svg,td,h1,h2,h3,h4,h5,h6,[onclick],[tabindex]")].filter((e) =>
    !e.matches(selector) && !e.closest(selector) && !e.querySelector(selector) && visible(e) && clickable(e));
  const candidates = [...document.querySelectorAll(selector), ...custom].sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);

  // ---- Popup detection ----
  // If a popup (modal) is open, the page behind it cannot be used, so it is left out entirely.
  // Step 1: ask the browser what is on top at a grid of screen points and look for a full-screen
  //         fixed layer (the dimmed backdrop, or a wrapper holding backdrop + popup box).
  // Step 2: two common structures:
  //   A. wrapper: the layer itself contains the popup's controls  -> the popup is that layer.
  //   B. backdrop only: the popup box is a separate sibling drawn above it -> the popup is whatever
  //      is on top of the backdrop (found by hit-testing each control).
  const fullScreenLayer = (hit) => {
    for (let n = hit; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      if (n.matches?.('dialog:modal,[aria-modal="true"]')) return n;
      const position = getComputedStyle(n).position;
      if (position !== "fixed" && position !== "absolute") continue;
      const r = n.getBoundingClientRect();
      if (r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9 && r.top <= innerHeight * 0.05 && r.left <= innerWidth * 0.05) return n;
    }
    return null;
  };
  // True when the element itself is what you would hit by clicking its centre.
  const onTop = (e) => {
    const r = e.getBoundingClientRect();
    const x = r.x + r.width / 2, y = r.y + r.height / 2;
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return null; // off screen: unknown
    const hit = document.elementFromPoint(x, y);
    return !!hit && (e.contains(hit) || hit.contains(e) || [...(e.labels || [])].some((l) => l.contains(hit)));
  };
  const votes = new Map();
  const GRID = 6;
  for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
    const layer = fullScreenLayer(document.elementFromPoint(((i + 0.5) / GRID) * innerWidth, ((j + 0.5) / GRID) * innerHeight));
    if (layer) votes.set(layer, (votes.get(layer) || 0) + 1);
  }
  const shown = candidates.filter((e) => e.type !== "hidden" && visible(e));
  let popupRoots = []; // the popup is everything inside these nodes
  for (const [layer, count] of [...votes].sort((a, b) => b[1] - a[1])) {
    const inside = shown.filter((e) => layer.contains(e));
    if (inside.length >= shown.length * 0.9) continue; // holds (nearly) the whole page: the app itself
    if (inside.length && count >= GRID * GRID * 0.6) { popupRoots = [layer]; break; } // A. wrapper
    if (!inside.length && count >= GRID * GRID * 0.2) { // B. backdrop only
      // For each control on top of the backdrop, take its outermost ancestor that does not also hold the backdrop.
      const roots = new Set();
      for (const e of shown) {
        if (onTop(e) !== true) continue;
        let n = e;
        while (n.parentElement && !n.parentElement.contains(layer)) n = n.parentElement;
        roots.add(n);
      }
      // A root holding most of the page is the page (e.g. a sticky header above the backdrop), not the popup.
      popupRoots = [...roots].filter((root) => shown.filter((e) => root.contains(e)).length < shown.length * 0.6);
      if (popupRoots.length) break;
    }
  }
  const popup = popupRoots.length > 0;
  const inPopup = (e) => popupRoots.some((root) => root.contains(e));
  const hiddenBehindPopup = popup ? shown.filter((e) => !inPopup(e)).length : 0;

  const elements = [];
  const nodes = []; // nodes[index - 1] is the DOM node of element `index`
  for (const e of candidates) {
    if (popup && !inPopup(e)) continue; // behind the popup
    if (e.type === "hidden" || !visible(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const item = {
      index: elements.length + 1,
      role: role(e),
      tag: e.tagName.toLowerCase(),
      label: name(e).slice(0, 300),
      // Page coordinates (independent of scroll) and whether it is on screen right now.
      rect: { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) },
      in_viewport: r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth,
    };
    if (e.type === "password") item.value = e.value ? "[hidden]" : "";
    else if ("value" in e && e.tagName !== "BUTTON" && e.tagName !== "LI") item.value = String(e.value);
    if (e.placeholder) item.placeholder = e.placeholder;
    if (e.getAttribute("href")) item.href = e.href;
    if (["checkbox", "radio"].includes(e.type)) item.checked = e.checked;
    for (const key of ["checked", "selected", "expanded", "pressed"]) {
      const v = e.getAttribute("aria-" + key);
      if (v !== null) item[key] = v;
    }
    if (e.disabled || e.getAttribute("aria-disabled") === "true") item.disabled = true;
    if (e.readOnly) item.readonly = true;
    if (e.required) item.required = true;
    if (e.tagName === "SELECT") {
      item.options = [...e.options].map((o) => ({ value: o.value, label: o.label, selected: o.selected, disabled: o.disabled }));
    }
    // Something smaller is on top of it right now (sticky bar, open menu, tooltip). Only testable on screen.
    if (onTop(e) === false) item.covered = true;
    elements.push(item);
    nodes.push(e);
  }
  // Kept so an action chosen from this JSON can be performed on the same node (extension/perform.js).
  globalThis.__webSnapNodes = nodes;

  // Headings give the page outline.
  const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6,[role=heading]")]
    .filter((h) => !popup || inPopup(h))
    .filter(visible)
    .map((h) => ({ level: Number(h.getAttribute("aria-level") || h.tagName[1]) || null, text: h.innerText.trim().replace(/\s+/g, " ") }))
    .filter((h) => h.text);

  return {
    url: location.href,
    title: document.title,
    lang: document.documentElement.lang || null,
    viewport: { w: innerWidth, h: innerHeight },
    scroll: { x: scrollX, y: scrollY, height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) },
    // When a popup is open, headings / elements / text below describe ONLY the popup.
    popup: popup ? { open: true, hidden_behind: hiddenBehindPopup } : { open: false },
    headings,
    elements,
    text: popup ? popupRoots.map((root) => root.innerText).join("\n") : document.body.innerText, // rendered text
  };
})()
