import { useState } from "react";
import { createRoot } from "react-dom/client";
import { AgentBar } from "rivkit";

// A small form for the agent to fill. Try: "Sign up as Asha, asha@example.com, plan Pro, accept terms and submit"
function App() {
  const [sent, setSent] = useState(null);
  return (
    <div style={{ maxWidth: 520, margin: "40px auto", fontFamily: "system-ui" }}>
      <AgentBar serverUrl="http://localhost:8765" apiKey="pk_dev_change_me" />
      <hr />
      {sent ? (
        <h2>Thanks {sent.name}! Signed up for {sent.plan}.</h2>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSent(Object.fromEntries(new FormData(e.target)));
          }}
          style={{ display: "grid", gap: 10 }}
        >
          <h2>Sign up</h2>
          <label>Name <input name="name" required /></label>
          <label>Email <input name="email" type="email" required /></label>
          <label>Plan
            <select name="plan">
              <option>Free</option>
              <option>Pro</option>
              <option>Team</option>
            </select>
          </label>
          <label><input name="terms" type="checkbox" required /> I accept the terms</label>
          <button type="submit">Create account</button>
        </form>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
