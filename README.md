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

## Use in another app

```bash
npm install path/to/web-snap-agent/client
```

```jsx
import { AgentBar } from "web-snap-agent-react";

<AgentBar serverUrl="https://agent.example.com" apiKey="pk_..." />
```

Add the app's origin to `ALLOWED_ORIGINS` and its key to `CLIENT_KEYS` in `server/.env`.

## Limits

- Only works in single-page apps. A full page reload ends the run.
- Clicks and typing are script events, so some widgets may ignore them.
- The server has no rate limiting yet.
