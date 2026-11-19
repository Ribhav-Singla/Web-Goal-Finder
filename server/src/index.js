// HTTP server: POST /act { state, goal, history } -> one action.
// Holds the OpenRouter key. Browsers authenticate with a client key (Authorization: Bearer pk_...).
import express from "express";
import cors from "cors";
import { nextAction, ActError } from "./agent.js";

const {
  OPENROUTER_API_KEY,
  JEV_MODEL = "typesafe/jev-router",
  CLIENT_KEYS = "",
  ALLOWED_ORIGINS = "",
  PORT = 8765,
} = process.env;

if (!OPENROUTER_API_KEY) throw new Error("Set OPENROUTER_API_KEY in server/.env (see .env.example).");
const clientKeys = new Set(CLIENT_KEYS.split(",").map((k) => k.trim()).filter(Boolean));
const origins = ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);

const app = express();
app.use(cors({ origin: origins.length ? origins : false }));
app.use(express.json({ limit: "2mb" }));

app.post("/act", async (req, res) => {
  const key = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!clientKeys.has(key)) return res.status(401).json({ error: "Invalid client key" });
  try {
    const { state, goal, history } = req.body;
    const action = await nextAction({ state, goal, history, model: JEV_MODEL, key: OPENROUTER_API_KEY });
    console.log(`${action.operation.padEnd(11)} ${action.target ?? ""} ${action.reason}`);
    res.json(action);
  } catch (error) {
    if (!(error instanceof ActError)) console.error(error);
    res.status(error instanceof ActError ? 422 : 500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`Agent server on http://localhost:${PORT}/act`));
