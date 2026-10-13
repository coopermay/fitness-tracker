# Roadmap and known limitations

What isn't built yet: feature ideas, items that were deliberately out of scope, and known limitations and technical debt. When you pick something up, move it into the relevant docs once it ships.

---

## Feature ideas

Roughly ordered by how much they'd help at the gym.

| Idea | What it would do | Notes |
| --- | --- | --- |
| **"Last time" in the log form** | When a machine is picked, show your last session and target on it, like the Today cards | The data is in the records response (`history`); the target rule is in `today.py` |
| **Targets on the lift page** | Show the Today-style target on each machine card | Reuse `target_for` from `today.py` |
| **More Insights** | Sections for the Insights tab: weekly sets per muscle group (8-week bars), this week vs last, recent PRs, biggest est. 1RM gains/stalls | One aggregation endpoint; PR flags and progress points already exist |
| **Bodyweight log** | Turn the single body-stats weight into dated weigh-ins with a trend chart | A `weigh_ins` table; Body stats would use the latest |
| **Weekly volume** | Hard sets per muscle group per week, shown next to the split or on the calendar | A new aggregation endpoint (sets per group per ISO week) |
| **Rest timer** | Starts automatically after saving a set | Frontend only; vibrate/notify when done |
| **PR dots on the calendar** | Mark PR days on the grid itself, not just in the tap details | `pr_count` is already in the response |
| **AI coach** (pinned) | A chat, probably inside the Insights tab, that answers questions from your data | See [below](#ai-assistant-plan) |
| **Multi-gym UI** | A gym picker, shown once a second gym exists | The schema already supports gyms; needs `PATCH /gyms`, gym selection in the set form, and per-gym machine lists |
| **Move a lift between muscle groups** | `PATCH /lifts/{id}` with `muscle_group_id` | Must re-check name uniqueness in the target group |
| **Merge duplicate metadata** | Merge two machines or lifts, re-pointing their sets | Explicitly out of scope so far; rename returns 409 instead |
| **Charts beyond est. 1RM** | Volume per session, per-weight rep trends | Extend `ProgressPoint` or add a new series |

### AI assistant plan
**Pinned.** Probably a section or sub-page of the Insights tab (all tab slots are used). The user wanted to **self-host an open model**, but a test with Llama on the homelab (October 2026) wasn't usable, so this waits for better hardware or a switch to a hosted model API. The tool-calling design below works either way (Ollama's API is OpenAI-compatible).

- **Don't fine-tune on the data. Use tool calling.** The model calls functions backed by the existing logic (`today.py` targets, records, calendar, insights), so answers come from real numbers. Fine-tuning teaches style, not facts, and the data changes every workout.
- **Other documents** (training articles, notes): RAG, with embeddings stored in this Postgres database via the **pgvector** extension.
- **Runtime:** [Ollama](https://ollama.com) as another Compose service, called through its OpenAI-compatible API from FastAPI. It's a new dependency, so it needs approval first. Pick a current small model that supports tool calling, sized to the homelab (a GPU with 8–16 GB runs 7–14B well; CPU-only suits about 3–4B, slowly).
- **Privacy:** self-hosted means the training data never leaves the server.

Steps:
1. Ollama on the homelab, chat from the terminal.
2. `POST /api/coach/chat` plus a chat page reached from Insights.
3. Read-only tools (Today, records, calendar, insights).
4. Streaming replies.
5. RAG with pgvector for your own documents.
6. Actions with confirmation ("log 185×6 on bench" → confirm → `POST /sets`).
7. Optional: a LoRA fine-tune experiment for tone.

---

## Out of scope (by original design)

These were explicitly excluded from the first version and still aren't built:
- Authentication or multiple users
- Offline mode (no service worker)
- Assisted-lift handling (e.g. assisted pull-up machines, where *less* weight is harder)
- Merging duplicate metadata
- A multi-gym UI

(Progressive-overload suggestions and charts were also out of scope originally. Charts have since been added, see `ProgressChart`, and suggestions are listed above.)

---

## Known limitations and technical debt

| Area | Limitation | Impact / workaround |
| --- | --- | --- |
| Frontend error messages | 422 validation errors (list-style `detail`) show as "Request failed (HTTP 422)" | The form validates input first, so this is rare. Could format `detail[].msg`. |
| "New best" vs calendar PR | `is_new_record` compares against all existing sets; the calendar replays by date. They can disagree for backdated sets. | Documented. Unify if it ever matters. |
| Plateau rule | Uses the "first at a weight counts" PR rule, so trying any new weight clears a plateau | A deliberate choice; revisit if plateau flags feel too rare |
| Archived items in the split | Split rows can reference archived muscle groups; they're silently ignored in the UI, and re-saving the split drops them | Low impact |
| Metadata cache | Changes made outside the app (curl, `/docs`, another device) to `staleTime: Infinity` data need a page reload | By design (single user, single client) |
| Muscle group archive | Doesn't invalidate `insights` or `split` | Badges/chips only show visible groups, so it's invisible in practice |
| Scaling | Calendar and insights load **all** sets per request | Fine for one person for years; add SQL filtering or paging if it grows |
| Frontend tests | None automated | Manual smoke test + headless screenshots ([Testing](../08-testing/testing.md#manual-checks)) |
| Single-gym assumption | New machines always go into the first gym (`SetForm`) | Fine until the multi-gym UI exists |
| Est. 1RM for 1 rep | Epley gives slightly more than the weight lifted | Kept as specified |
| `updated_at` | Only bumped by ORM updates, not raw SQL | Don't edit sets with raw SQL if you rely on it |
| `httpx` deprecation warning | pytest warns that Starlette prefers `httpx2` | Harmless; switching is a deliberate dependency change |
| Docker port 5432 | Published for dev convenience | Remove the `ports:` entry on a server |
| Security | No auth, dev credentials, HTTP | Private network / Tailscale only ([Security notes](../07-operations/docker-and-deployment.md#security-notes)) |
