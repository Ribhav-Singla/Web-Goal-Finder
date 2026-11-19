# web-snap-agent

A Chrome extension that performs a goal on the current page. You type the goal; it reads the page as JSON (no screenshot), asks a model for the next action, performs it, and repeats.

```text
popup (goal) → background.js → snapshot.js reads the page
                             → act.py asks the model for one action
                             → perform.js clicks / types / selects / scrolls
                             → repeat until DONE, BLOCKED, Stop, or 25 steps
```

## Setup

1. Copy `.env.example` to `.env` and put your [OpenRouter](https://openrouter.ai/keys) key in `JEV_API_KEY`.
2. Start the local server (Python 3.10 or newer, nothing to install):

   ```bash
   python act.py --serve
   ```

3. In `chrome://extensions`, turn on Developer mode, click **Load unpacked**, and choose the `extension/` folder.
4. Open a page, click the Web Goal Finder icon, type a goal, press **Run**.

The popup lists each step and why it was chosen. It can be closed and reopened during a run. The server terminal prints one line per step.

## Model

`JEV_MODEL` in `.env` is any OpenRouter model id. The default, `typesafe/jev-router`, is TypeSafe's router: it picks a model for each request, so different steps can be answered by different models. Set a fixed model id to always use the same one.

## Files

| File | Job |
| --- | --- |
| [act.py](act.py) | Local server on `127.0.0.1:8765`. Takes page state + goal + history, calls the model, checks the answer names a real element, returns one action. Holds the key. |
| [extension/background.js](extension/background.js) | The run loop, and snapshot saving. |
| [extension/snapshot.js](extension/snapshot.js) | Runs in the page: numbered interactive elements, text, headings. |
| [extension/perform.js](extension/perform.js) | Runs in the page: performs one action on the element with the chosen number. |
| [extension/popup.html](extension/popup.html), [popup.js](extension/popup.js) | The goal box and step list. |
| [extension/boxes.js](extension/boxes.js) | Numbered boxes for the debug screenshot. |

## Also

- **Save snapshot** in the popup (or Alt+Shift+S) saves the page state JSON and screenshots to `Downloads/web-snap`.
- `python act.py saved.json "goal"` prints the next action for a saved page state without touching the browser.

## Limits

- Clicks and typing are script events, not real mouse or keyboard input, so some sites may ignore them.
- The run stays in the tab it started in; a link that opens a new tab is not followed.
- The server only accepts requests from Chrome extensions and local tools, so web pages cannot spend the key.
