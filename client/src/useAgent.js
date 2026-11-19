import { useRef, useState } from "react";
import { runAgent } from "./core/runAgent.js";

// All run state, no UI. Any variant (bar, floating button, voice) can be built on this.
export function useAgent({ serverUrl, apiKey, maxSteps }) {
  const [status, setStatus] = useState("idle"); // idle | running | done | blocked | stopped | error | "stopped after N steps"
  const [steps, setSteps] = useState([]);
  const [error, setError] = useState("");
  const controller = useRef(null);
  const running = status === "running";

  async function run(goal) {
    if (running || !goal.trim()) return;
    controller.current = new AbortController();
    setSteps([]);
    setError("");
    setStatus("running");
    try {
      const final = await runAgent({
        goal, serverUrl, apiKey, maxSteps,
        signal: controller.current.signal,
        onStep: (step) => setSteps((s) => [...s, step]),
      });
      setStatus(final);
    } catch (e) {
      if (controller.current.signal.aborted) return setStatus("stopped");
      setError(e.message);
      setStatus("error");
    }
  }

  const stop = () => controller.current?.abort();

  return { status, steps, error, running, run, stop };
}
