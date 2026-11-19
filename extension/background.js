// Two jobs, both started from the popup:
//   Run goal       read the page state -> ask act.py for the next action -> perform it -> repeat.
//                  No screenshots. Needs `python act.py --serve` running.
//   Save snapshot  (also Alt+Shift+S) save the page state to Downloads/web-snap/<site>-<time>.json, plus PNGs.

const ACT_URL = "http://127.0.0.1:8765/act"; // act.py --serve
const MAX_STEPS = 25;
const SAVE_SCREENSHOT = true;
const DEBUG_BOXES = true; // also save <name>-boxes.png with numbered boxes (needs SAVE_SCREENSHOT)
importScripts("boxes.js", "perform.js");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// snapshot.js is one expression; its value comes back as the result.
async function readState(tabId) {
  const [{ result: state }] = await chrome.scripting.executeScript({ target: { tabId }, files: ["snapshot.js"] });
  if (!state) throw new Error("The page returned no state");
  return state;
}

// ---------------------------------------------------------------- Run goal

let stopRequested = false;
let running = false;

// Chrome can shut this worker down mid-run; when it starts again, do not leave the popup saying "Running".
chrome.storage.session.get("run").then(({ run }) => {
  if (run?.status === "running" && !running) report({ ...run, status: "error", error: "The run was interrupted" });
});

// The popup shows whatever is stored here, so it can be closed and reopened during a run.
async function report(run) {
  await chrome.storage.session.set({ run });
}

async function runGoal(tabId, goal) {
  if (running) return;
  running = true;
  stopRequested = false;
  const run = { goal, status: "running", steps: [] };
  const history = []; // what act.py is told has already been done
  try {
    for (let n = 1; n <= MAX_STEPS; n++) {
      await report(run);
      if (stopRequested) { run.status = "stopped"; break; }

      const state = await readState(tabId);
      const response = await fetch(ACT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, goal, history }),
      }).catch(() => {
        throw new Error("Cannot reach the act server. Start it with: python act.py --serve");
      });
      const action = await response.json();
      if (!response.ok) throw new Error(action.error || `Act server returned ${response.status}`);
      if (stopRequested) { run.status = "stopped"; break; } // decided, but not performed

      const step = { n, operation: action.operation, reason: action.reason, ms: action.latency_ms };
      if (action.element) step.target = `[${action.target}] ${action.element.label}`.slice(0, 90);
      if (action.text) step.text = action.text;
      if (action.option) step.text = action.option.label;
      run.steps.push(step);
      chrome.action.setBadgeBackgroundColor({ color: "#1d5fa8" });
      chrome.action.setBadgeText({ text: String(n) });

      if (action.operation === "DONE" || action.operation === "BLOCKED") {
        run.status = action.operation.toLowerCase();
        break;
      }
      if (action.operation === "WAIT") {
        await sleep(1500);
        step.result = "ok";
      } else {
        // The page may navigate away while the click is still returning; that is a success.
        const [{ result } = {}] = await chrome.scripting
          .executeScript({ target: { tabId }, func: perform, args: [action] })
          .catch(() => [{ result: { ok: true } }]);
        step.result = !result || result.ok ? "ok" : result.error;
        await settle(tabId);
      }
      const { url } = await chrome.tabs.get(tabId);
      history.push({
        operation: action.operation, target: step.target, text: step.text,
        result: step.result, page_url_changed: url !== state.url,
      });
      if (n === MAX_STEPS) run.status = `stopped after ${MAX_STEPS} steps`;
    }
  } catch (error) {
    console.error("Web Goal Finder:", error);
    run.status = "error";
    run.error = String(error?.message || error);
  }
  running = false;
  await report(run);
  const good = run.status === "done";
  chrome.action.setBadgeBackgroundColor({ color: good ? "#1d7a3a" : "#c0352b" });
  chrome.action.setBadgeText({ text: good ? "OK" : "!" });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 6000);
}

// Give the page a moment to react, and wait for a navigation to finish loading (max 10 s).
async function settle(tabId) {
  await sleep(700);
  for (let i = 0; i < 40; i++) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === "complete") break;
    await sleep(250);
  }
  await sleep(300);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "run") runGoal(message.tabId, message.goal);
  if (message.type === "stop") stopRequested = true;
  if (message.type === "save") chrome.tabs.get(message.tabId).then(saveSnapshot);
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "save-snapshot" && tab) saveSnapshot(tab);
});

// ---------------------------------------------------------------- Save snapshot

async function saveSnapshot(tab) {
  const started = performance.now();
  try {
    const state = await readState(tab.id);

    // Element positions in the JSON are page pixels; the screenshot shows only the visible part.
    // To place an element on the screenshot: x - scroll.x, y - scroll.y, times device_pixel_ratio.
    const [{ result: ratio }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => devicePixelRatio,
    });
    state.device_pixel_ratio = ratio;
    state.captured_at = new Date().toISOString();
    state.capture_ms = Math.round(performance.now() - started);

    // Take the picture right after reading the state, before saving anything, so the two match.
    const png = SAVE_SCREENSHOT ? await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }) : null;

    // Debug: show numbered boxes on the page, photograph it again, remove them.
    let boxes = null;
    if (png && DEBUG_BOXES) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: showBoxes,
          args: [state.elements.map(({ index, rect }) => ({ index, rect }))],
        });
        await sleep(600); // Chrome allows 2 screenshots per second
        boxes = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
      } catch (error) {
        state.boxes_error = String(error?.stack || error);
      } finally {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: hideBoxes }).catch(() => {});
      }
    }
    state.extension_version = chrome.runtime.getManifest().version;

    const base = `web-snap/${slug(state.url)}-${stamp()}`;
    await save(
      "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2)),
      base + ".json",
    );
    if (png) await save(png, base + ".png");
    if (boxes) await save(boxes, base + "-boxes.png");
    badge(tab.id, String(state.elements.length), "#1d7a3a");
  } catch (error) {
    console.error("Web Goal Finder:", error);
    badge(tab.id, "ERR", "#c0352b");
  }
}

function save(url, filename) {
  return chrome.downloads.download({ url, filename, saveAs: false, conflictAction: "uniquify" });
}

function slug(url) {
  return url.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// Show the number of elements found (or ERR) on the icon for a few seconds.
function badge(tabId, text, color) {
  chrome.action.setBadgeBackgroundColor({ color, tabId });
  chrome.action.setBadgeText({ text, tabId });
  setTimeout(() => chrome.action.setBadgeText({ text: "", tabId }), 4000);
}
