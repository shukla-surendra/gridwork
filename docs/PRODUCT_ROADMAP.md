# Product Roadmap

## Vision

One workspace that replaces the "five different SaaS tabs" habit: notetaking
(Notion/Apple Notes), task tracking, a Kanban board (Trello), a wiki
(Confluence), reminders, chat, and the personal-management layer that ties
them together (calendar, time-blocking, reports) — scoped to a single user
or small team's own workspace, not a multi-tenant product.

## Current state by feature area

Verified against the actual code (`assistant_web/src/pages/dashboard/`,
`assistant_web/src/App.js`, `assistant_backend/adapters/orm/models/pg_models.py`)
as of this writing, not aspirational.

| Feature | Maps to | Status | Route |
|---|---|---|---|
| Tasks (priority/status/type/assignee) | Issue tracking | **Live** — real CRUD, Redux-backed | `/tasks` |
| Notes / quick notes | Notion / Apple Notes | **Live** — Lexical rich-text editor, real CRUD | `/notes` |
| Time Block | Personal management | **Live** — real CRUD via `TaskDataService` | `/timeblock` |
| CRM (Contacts/Deals/Activities) | — | **Live** — Redux thunks (`fetchContacts`/`fetchDeals`) | `/crm` |
| Chat | Slack-lite / AI assistant | **Live** — wired to backend | `/chat` |
| Members / workspace roles | — | **Live** | `/members`, `/workspace-members` |
| Settings (profile, workspace, members, avatar) | — | **Live** | `/settings` |
| Notifications | — | **Live** | `/notifications` |
| Wiki | Confluence | **UI built, not backend-wired** — local `useState` only, no fetch | `/wiki` |
| Database (Notion-style tables) | Notion databases | **UI built, not backend-wired** — same as Wiki | `/database` |
| Reports | Personal management | **UI built, not backend-wired** — static cards | `/reports` |
| Calendar | Personal management | **UI built, not backend-wired** — FullCalendar shell, no event source | `/calendar` |
| Reminders | Reminders | **Placeholder only** — `Reminder` DB model + migration already exist (`pg_models.py`), zero frontend until this pass | `/reminders` |
| Boards (Kanban) | Trello | **Placeholder only** — `Board`/`BoardItem` DB models + a seeded "Sprint Board" fixture exist, zero real board UI (`TaskBoardViewBox.js` is a card component used inside `TaskDetailPage`'s subtask list, not a board view) | `/boards` |

Not individually re-audited in this pass, but presumed live given their
size/pattern (`taskservice`/`http-common` usage): Search Tasks, Search
Notebooks, Task Detail, Note Detail.

## What's next, roughly prioritized

1. **Wire Calendar to real data** — pull from Tasks (`due_on`) and Time
   Blocks instead of a static FullCalendar shell. Biggest gap-to-value ratio:
   the UI already exists.
2. **Reminders CRUD** — the DB model already exists; this is close to a pure
   "build the API + wire the placeholder page" task, not new design.
3. **Boards (Kanban)** — needs a `BoardService.js` (doesn't exist yet),
   drag-and-drop (e.g. `react-beautiful-dnd`, already a dependency per
   `package.json`, currently unused for this), and a `board_id`-scoped task
   view reusing the existing Task model — no new backend schema needed
   beyond what `Board`/`BoardItem` already have.
4. **Wire Wiki and Database to real data** — `Page`/`Block` and
   `Database`/`DatabaseEntry` models already exist in `pg_models.py` and
   are seeded via `fixtures.py`; same shape as #1/#2, UI-first-backend-second.
5. **Wire Reports to real data** — task completion / time distribution
   queries against existing Task/TimeBlock data; no new schema needed.

## Navigation

`Navbar.js`'s nav is grouped to mirror this doc's feature areas directly:
**Quick Access** (Tasks, Boards, Notes, Calendar, Time Block, Reminders),
**Knowledge** (Wiki, Database), **Collaboration** (CRM, Chat), **Search**,
**Workspace** (Members, Reports, Settings). Every route above is reachable
from the sidebar — nothing is hidden behind a direct URL anymore.
