# Roadmap and known limitations

What isn't built yet: feature ideas, items that were deliberately out of scope, and known limitations and technical debt. When you pick something up, move it into the relevant docs once it ships.

---

## Feature ideas

Roughly ordered by how much they'd help at the gym.

| Idea | What it would do | Notes |
| --- | --- | --- |
| **"Last time" in the log form** | When a machine is picked, show your last session on it ("Sep 25: 185 × 5, 175 × 6") | All the data is already in the records response (`history`); frontend-only |
| **Next target** | Suggest what to beat: "185 × 6 for a new best", or "hit 12+ at 105 → try 110" | Simple rules over records. Progressive-overload suggestions were out of scope for the first version. |
| **Today's workout** | On a split day, list today's lifts with last numbers and targets on one screen | Combines the split, records and next target; could use a placeholder tab |
| **Weekly volume** | Hard sets per muscle group per week, shown next to the split or on the calendar | A new aggregation endpoint (sets per group per ISO week) |
| **Rest timer** | Starts automatically after saving a set | Frontend only; vibrate/notify when done |
| **PR dots on the calendar** | Mark PR days on the grid itself, not just in the tap details | `pr_count` is already in the response |
| **AI assistant** | A chat that answers questions from your data ("what should I go for on bench today?") | See [below](#ai-assistant-plan) |
| **Multi-gym UI** | A gym picker, shown once a second gym exists | The schema already supports gyms; needs `PATCH /gyms`, gym selection in the set form, and per-gym machine lists |
| **Move a lift between muscle groups** | `PATCH /lifts/{id}` with `muscle_group_id` | Must re-check name uniqueness in the target group |
| **Merge duplicate metadata** | Merge two machines or lifts, re-pointing their sets | Explicitly out of scope so far; rename returns 409 instead |
| **Charts beyond est. 1RM** | Volume per session, per-weight rep trends | Extend `ProgressPoint` or add a new series |

### AI assistant plan
A natural next learning project. A suggested path:
1. **Basic chat.** A FastAPI endpoint that calls a hosted LLM API, plus a chat page (in a placeholder tab). The API key stays on the **backend** only.
2. **Read-only tools.** Let the model call functions backed by existing logic (records for a lift, the calendar, insights), so answers come from real data.
3. **Streaming.** Stream replies token by token (FastAPI streaming responses + incremental rendering in React).
4. **Actions with confirmation.** "Log 185 for 6 on bench" produces a proposed set the UI asks you to confirm before calling `POST /sets`.

Before building:
- your training data would be sent to the LLM provider, so it'd no longer stay entirely on your home server,
- each message has a small per-message cost.

Building "last time" and "next target" first is useful: they become the assistant's best tools.

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
