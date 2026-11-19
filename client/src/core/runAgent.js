// The loop: read the page -> ask the server for one action -> perform it -> repeat.
// From extension/background.js. Ends on DONE, BLOCKED, signal.aborted, an error, or maxSteps.
import { snapshot } from "./snapshot.js";
import { perform } from "./perform.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// onStep(step) is called after every step; resolves to the final status.
export async function runAgent({ goal, serverUrl, apiKey, maxSteps = 25, signal, onStep }) {
  const history = []; // what the server is told has already been done
  for (let n = 1; n <= maxSteps; n++) {
    if (signal?.aborted) return "stopped";
    const { state, nodes } = snapshot();

    const response = await fetch(`${serverUrl.replace(/\/$/, "")}/act`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ state, goal, history }),
      signal,
    });
    const action = await response.json();
    if (!response.ok) throw new Error(action.error || `Agent server returned ${response.status}`);

    const step = { n, operation: action.operation, reason: action.reason };
    if (action.element) step.target = `[${action.target}] ${action.element.label}`.slice(0, 90);
    if (action.text) step.text = action.text;
    if (action.option) step.text = action.option.label;

    if (action.operation === "DONE" || action.operation === "BLOCKED") {
      onStep?.(step);
      return action.operation.toLowerCase();
    }
    if (action.operation === "WAIT") {
      await sleep(1500);
      step.result = "ok";
    } else {
      const result = await perform(action, nodes);
      step.result = result.ok ? "ok" : result.error;
      await sleep(1000); // let the page react
    }
    onStep?.(step);
    history.push({
      operation: step.operation, target: step.target, text: step.text,
      result: step.result, page_url_changed: location.href !== state.url,
    });
  }
  return `stopped after ${maxSteps} steps`;
}
