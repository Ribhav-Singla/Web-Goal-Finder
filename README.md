# web-snap-agent

A React input bar that performs a goal on the page it is placed in. It reads the page as JSON, asks the server for the next action, performs it, and repeats.

```text
client (AgentBar) → POST server/act {state, goal, history} → OpenRouter
                  ← one action (CLICK / TYPE_TEXT / SELECT / SCROLL / WAIT / DONE / BLOCKED)
```

| Folder | What |
| --- | --- |
| [server/](server/) | Node service. Holds the OpenRouter key, checks the client key and origin, returns one action. |
| [client/](client/) | The React package: `<AgentBar serverUrl apiKey />`. |
| [example/](example/) | Vite app with a sign-up form to test against. |

## Run

```bash
cd server && cp .env.example .env   # set OPENROUTER_API_KEY, CLIENT_KEYS, ALLOWED_ORIGINS
npm install && npm start

cd client && npm install && npm run build

cd example && npm install && npm run dev   # http://localhost:5173
```

Try: `Sign up as Asha, asha@example.com, plan Pro, accept the terms and submit`.

After changing `client/src`, run `npm run build` in `client/` and restart the example.

## Use in another app

```bash
npm install path/to/web-snap-agent/client
```

```jsx
import { AgentBar } from "web-snap-agent-react";

<AgentBar serverUrl="https://agent.example.com" apiKey="pk_..." />
```

Add the app's origin to `ALLOWED_ORIGINS` and its key to `CLIENT_KEYS` in `server/.env`.

`AgentBar` props: `serverUrl`, `apiKey`, `maxSteps` (default 25), `placeholder`, `className`, `style`.

To build your own UI, use the hook instead:

```jsx
import { useAgent } from "web-snap-agent-react";

const { status, steps, error, running, run, stop } = useAgent({ serverUrl, apiKey });
// run("goal text"), stop(). Put data-agent-ignore on your UI's root so the agent does not see it.
```

## Server config (`server/.env`)

| Variable | What |
| --- | --- |
| `OPENROUTER_API_KEY` | The OpenRouter key. Only the server has it. |
| `JEV_MODEL` | Any OpenRouter model id. Default `typesafe/jev-router`. |
| `CLIENT_KEYS` | Comma-separated keys the component may send as `apiKey`. Make up your own. |
| `ALLOWED_ORIGINS` | Comma-separated sites allowed to call the server. |
| `PORT` | Default `8765`. |

## Client structure

```text
client/src/
├─ index.js              exports AgentBar, useAgent, runAgent
├─ useAgent.js           run state (status, steps, error, run, stop), no UI
├─ styles.js             colours and style objects shared by all components
├─ components/
│  ├─ AgentBar.jsx       the bar: puts the pieces below together
│  ├─ GoalInput.jsx      text box + Run / Stop
│  ├─ StatusBadge.jsx    status pill
│  └─ StepList.jsx       numbered steps
└─ core/                 no React
   ├─ runAgent.js        loop: read page → ask server → perform → repeat
   ├─ snapshot.js        reads the page (skips [data-agent-ignore])
   └─ perform.js         clicks, types, selects, scrolls
```

Where to extend:

- **New variant** (floating button, sidebar): a new component in `components/` built on `useAgent`, reusing `GoalInput`, `StepList`, `StatusBadge`.
- **Mic input**: a `MicButton` inside `GoalInput` that turns speech into text and calls the same `onRun(goal)`.
- **Theming**: change `colors` in `styles.js`.

## Limits

- Only works in single-page apps. A full page reload ends the run.
- Clicks and typing are script events, so some widgets may ignore them.
- The server has no rate limiting yet.
