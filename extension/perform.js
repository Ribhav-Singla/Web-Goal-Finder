// Runs inside the page. Performs ONE action chosen from the last snapshot.
// `action` is what act.py returned: { operation, target, text, option }.
// `target` is an element index from the snapshot JSON; snapshot.js kept the matching DOM nodes.
// Returns { ok: true } or { ok: false, error }.
async function perform(action) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const operation = action.operation;

  if (operation === "SCROLL_DOWN" || operation === "SCROLL_UP") {
    const before = scrollY;
    scrollBy({ top: (operation === "SCROLL_DOWN" ? 0.8 : -0.8) * innerHeight, behavior: "instant" });
    await sleep(100);
    return scrollY === before ? { ok: false, error: "The page did not scroll" } : { ok: true };
  }

  const node = (globalThis.__webSnapNodes || [])[action.target - 1];
  if (!node || !node.isConnected) return { ok: false, error: "The element is no longer on the page" };
  node.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
  await sleep(60);

  if (operation === "CLICK") {
    const r = node.getBoundingClientRect();
    const at = { bubbles: true, cancelable: true, composed: true, view: window, button: 0,
      clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 };
    // Some widgets open on mousedown rather than click, so send the whole sequence.
    node.dispatchEvent(new PointerEvent("pointerdown", { ...at, buttons: 1, pointerType: "mouse", isPrimary: true }));
    node.dispatchEvent(new MouseEvent("mousedown", { ...at, buttons: 1 }));
    if (typeof node.focus === "function") node.focus({ preventScroll: true });
    node.dispatchEvent(new PointerEvent("pointerup", { ...at, pointerType: "mouse", isPrimary: true }));
    node.dispatchEvent(new MouseEvent("mouseup", at));
    if (typeof node.click === "function") node.click();
    else node.dispatchEvent(new MouseEvent("click", at)); // e.g. <svg>
    return { ok: true };
  }

  if (operation === "TYPE_TEXT") {
    node.focus({ preventScroll: true });
    if (node.isContentEditable) {
      document.execCommand("selectAll");
      document.execCommand("insertText", false, action.text);
    } else if ("value" in node) {
      node.value = action.text;
      node.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: action.text }));
      node.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      return { ok: false, error: "The element is not a text field" };
    }
    return { ok: true };
  }

  if (operation === "SELECT") {
    if (node.tagName !== "SELECT") return { ok: false, error: "The element is not a dropdown" };
    const option = node.options[action.option.number - 1];
    if (!option || option.value !== action.option.value) return { ok: false, error: "The dropdown options changed" };
    node.selectedIndex = option.index;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
    return { ok: true };
  }

  return { ok: false, error: "Unknown operation " + operation };
}
