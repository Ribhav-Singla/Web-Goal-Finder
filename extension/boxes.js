// DEBUG ONLY: numbered boxes for matching the screenshot with the JSON.
// They are drawn on the page itself for a moment, photographed, then removed.
// To remove later: delete this file, the importScripts line and the DEBUG_BOXES block in background.js.

// Runs inside the page. `elements` are the JSON elements (rect in page pixels).
function showBoxes(elements) {
  document.getElementById("__web_snap_boxes")?.remove();
  const layer = document.createElement("div");
  layer.id = "__web_snap_boxes";
  layer.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none;";
  for (const e of elements) {
    const box = document.createElement("div");
    box.style.cssText =
      `position:absolute;left:${e.rect.x}px;top:${e.rect.y}px;width:${e.rect.w}px;height:${e.rect.h}px;` +
      "box-sizing:border-box;border:2px solid rgb(230,30,80);pointer-events:none;";
    const tag = document.createElement("span");
    tag.textContent = e.index;
    tag.style.cssText =
      `position:absolute;left:-2px;${e.rect.y >= 16 ? "top:-16px" : "top:-2px"};height:14px;padding:0 3px;` +
      "background:rgb(230,30,80);color:#fff;font:600 11px/14px system-ui,sans-serif;white-space:nowrap;";
    box.append(tag);
    layer.append(box);
  }
  document.documentElement.append(layer);
  // Resolve after the boxes have actually been painted.
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(elements.length))));
}

function hideBoxes() {
  document.getElementById("__web_snap_boxes")?.remove();
}
