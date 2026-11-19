// The popup only starts/stops a run and shows its progress. The run itself lives in background.js,
// so it continues if the popup closes.

const $ = (id) => document.getElementById(id);

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function render(run) {
  const busy = run?.status === "running";
  $("run").disabled = busy;
  $("stop").disabled = !busy;
  $("status").className = run?.status || "";
  $("status").textContent = !run ? "" : busy ? "Running…" : run.error ? `Error: ${run.error}` : `Finished: ${run.status}`;
  $("steps").replaceChildren(
    ...(run?.steps || []).map((step) => {
      const li = document.createElement("li");
      const add = (cls, text) => {
        const span = document.createElement("span");
        span.className = cls;
        span.textContent = text;
        li.append(span);
      };
      add("op", step.operation);
      if (step.target) add("", " " + step.target);
      if (step.text) add("", ` → “${step.text}”`);
      if (step.result && step.result !== "ok") add("bad", ` (${step.result})`);
      if (step.reason) add("muted", ` — ${step.reason}`);
      return li;
    }),
  );
  $("steps").scrollTop = $("steps").scrollHeight;
}

$("run").onclick = async () => {
  const goal = $("goal").value.trim();
  if (!goal) return $("goal").focus();
  chrome.storage.local.set({ goal });
  render({ status: "running", steps: [] });
  chrome.runtime.sendMessage({ type: "run", goal, tabId: (await activeTab()).id });
};
$("stop").onclick = () => chrome.runtime.sendMessage({ type: "stop" });
$("save").onclick = async () => {
  chrome.runtime.sendMessage({ type: "save", tabId: (await activeTab()).id });
  window.close(); // the popup must not be in the screenshot
};
$("goal").onkeydown = (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) $("run").click();
};

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "session" && changes.run) render(changes.run.newValue);
});
chrome.storage.local.get("goal").then(({ goal }) => { if (goal) $("goal").value = goal; });
chrome.storage.session.get("run").then(({ run }) => render(run));
