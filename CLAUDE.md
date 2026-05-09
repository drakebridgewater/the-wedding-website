# Wedding Website — AI Instructions

> [!info] Project at a glance
> Django 4.2 backend + Vite/React 18 (TypeScript) frontend. Originally forked from [czue/django-wedding-website](https://github.com/czue/django-wedding-website) and extended into a full planning platform. Source of truth is the database; Google Sheets is a one-way export so a non-technical partner can read everything in a spreadsheet.

> Last verified against repo: 2026-05-06
> Tags: #project/wedding-website #stack/django #stack/react #stack/vite

---

## 1. Architecture in one paragraph

Django serves the public wedding site, RSVP flow, dashboard, and per-feature planning pages. Each planning page (budget, vendors, todos, seating, schedule, music, guests, estimator) is a Django template that mounts a single-page React island via [`django-vite`](https://github.com/MrBin99/django-vite). The React app talks back to the same Django app over a small DRF JSON API. A `drive_sync` app pushes a snapshot of every relevant table into a single Google Spreadsheet on demand.

Data flow is one-way by default: **Postgres → Sheets**. Only the guest CSV importer pulls data inward.

---

## 2. Tech stack (verified)

> [!warning] Trust this list, not memory
> The previous version of this file claimed Celery, Redis, pandas, django-import-export, django-extensions, shadcn/ui, and zustand. **None of those are installed.** Don't reach for them.

### Backend — `requirements/base.txt`

| Package | Purpose |
|---|---|
| `django==4.2.*` | Web framework |
| `djangorestframework` | JSON API (`api_views.py` in each app) |
| `django-vite` | Loads Vite manifest / HMR client into Django templates |
| `django-environ` | `.env` parsing in `config/settings/production.py` |
| `django-money` (`djmoney`) | `MoneyField` for budget, vendors, expenses |
| `psycopg2-binary` | Postgres driver |
| `whitenoise` | Static file serving in production |
| `gspread` + `google-auth` | Google Sheets sync (service account auth) |
| `Pillow` | Image uploads (vendor photos, hero photo) |
| `requests` + `beautifulsoup4` | Vendor photo scraping, MusicBrainz lookups, TickTick HTTP |

`requirements/local.txt` is just `-r base.txt`. `requirements/production.txt` adds `gunicorn`.

### Frontend — `frontend/package.json`

- **Build:** Vite 5 + React 18 + TypeScript 5
- **Styling:** Tailwind 3 + `clsx` + `tailwind-merge` (no shadcn/ui — components are hand-rolled in `frontend/src/lib/`)
- **Server state:** `@tanstack/react-query`
- **Tables:** `@tanstack/react-table`
- **Forms:** `react-hook-form` + `zod` + `@hookform/resolvers`
- **Drag-and-drop:** `@dnd-kit/core` + `@dnd-kit/utilities` (seating chart)
- **Charts:** `recharts` (budget, estimator)
- **Maps:** `leaflet` + `react-leaflet` (vendor locations)
- **Rich text:** `@tiptap/react` + extensions (vendor / event notes)
- **Icons:** `lucide-react`
- **Toasts:** `sonner`
- **Dates:** `date-fns`

> [!note] No global client store
> There's no zustand / redux. Server state lives in React Query; everything else is local component state.

---

## 3. Repo layout

```
the-wedding-website/
├── config/                       # Project (not an app)
│   ├── settings/
│   │   ├── base.py               # All wedding defaults + integration config
│   │   ├── local.py              # SQLite, Vite dev_mode=True, console email
│   │   └── production.py         # Postgres, Whitenoise, env-driven
│   ├── urls.py                   # Root URL routing
│   ├── context_processors.py     # Google Places key
│   └── wsgi.py / asgi.py
├── wedding/                      # Public site (home, party, honeymoon, hero upload)
├── guests/                       # Party/Guest/RSVP/wedding party + invitations + email templates
├── dashboard/                    # /dashboard/ — staff overview & milestones
├── budget/                       # BudgetCategory, BudgetLineItem, Expense + estimator
├── vendors/                      # Venue/Caterer/Cake/Florist/Entertainment + photos + scrape + checklist
├── seating/                      # SeatingConfig, SeatingTable + drag-and-drop assignment
├── schedule/                     # ScheduleDay, ScheduleEvent, groups, public program page
├── todos/                        # Task + TickTickSettings (TickTick OAuth sync)
├── music/                        # Song (playlist + do-not-play) + MusicBrainz search
├── drive_sync/                   # Google Sheets exporter
├── frontend/
│   ├── src/
│   │   ├── budget/  estimator/  vendors/  todos/  seating/
│   │   ├── schedule/  music/  guests/  public/  lib/
│   │   └── index.css
│   ├── vite.config.ts            # Multi-entry build → ../static/dist/
│   └── package.json
├── templates/                    # base.html, base_public.html, partials/, registration/
├── static/                       # Source static (Vite outputs into static/dist/)
├── static_root/                  # collectstatic target
├── media/                        # User uploads (hero, vendor photos)
├── requirements/                 # base.txt / local.txt / production.txt
├── deploy/                       # supervisor configs, prod-requirements
├── Makefile                      # `make dev` / `make prod`
├── Dockerfile + docker-compose.yml
└── manage.py
```

---

## 4. URL map

From `config/urls.py`:

| Path prefix | App | What's there |
|---|---|---|
| `/` | `wedding`, `guests` | Public site, RSVP flows |
| `/dashboard/` | `dashboard` | Staff overview |
| `/budget/` | `budget` | Budget tracker (`/`) and estimator (`/estimator/`) |
| `/vendors/<type>/` | `vendors` | `venue`, `caterer`, `cake`, `florist`, `entertainment` |
| `/seating/` | `seating` | Drag-and-drop chart |
| `/schedule/` | `schedule` | Internal schedule, `/schedule/program/` is public, `/schedule/groups/` for emails |
| `/todos/` | `todos` | Task list (TickTick-synced) |
| `/music/` | `music` | Playlist + do-not-play |
| `/drive/sync/` | `drive_sync` | POST endpoint to trigger sync (login required) |
| `/admin/` | Django admin | |
| `/accounts/` | Django auth | login/logout/password |

Inside each app, page views live in `views.py` and JSON endpoints in `api_views.py`. API routes are nested under each app's URLconf as `api/...`.

---

## 5. Frontend ↔ Django integration

> [!important] The contract
> Every interactive page is a Django template that:
> 1. `{% load django_vite %}`
> 2. Calls `{% vite_asset 'src/<module>/main.tsx' %}` in the head block
> 3. Renders an empty mount node like `<div id="<module>-root"></div>`
>
> The React entry in `frontend/src/<module>/main.tsx` finds that node and renders into it.

Vite entry points (defined in `frontend/vite.config.ts`):

```
budget, estimator, vendors, todos, todos-quick-add,
seating, schedule, music, guests, public
```

- **Dev:** `make dev` runs Vite on `:5173` and Django on `:8002`. `local.py` sets `DJANGO_VITE.dev_mode = True`, so `{% vite_asset %}` emits HMR-aware tags pointing at `:5173`.
- **Prod:** `npm run build` outputs to `static/dist/` with a manifest. `base.py` sets `dev_mode = False` and reads `static/dist/.vite/manifest.json`. `collectstatic` then ships it.

---

## 6. Settings & configuration

### Where things live

| File | Role |
|---|---|
| `config/settings/base.py` | Defaults — installed apps, REST framework, wedding-specific values, TickTick + Google config, logging |
| `config/settings/local.py` | DEBUG=True, SQLite by default (Postgres if `PGHOST`/`DB_HOST` set), console email, Vite dev mode |
| `config/settings/production.py` | DEBUG=False, reads `.env` via `django-environ`, Whitenoise middleware, SMTP if `EMAIL_HOST` set |

`manage.py` defaults to `config.settings.local`. Production sets `DJANGO_SETTINGS_MODULE=config.settings.production`.

### Wedding-specific defaults (override in env / `local.py`)

`BRIDE_AND_GROOM`, `WEDDING_DATE`, `WEDDING_LOCATION`, `WEDDING_WEBSITE_URL`, `DEFAULT_WEDDING_EMAIL`, `WEDDING_CC_LIST`, `REGISTRY_URL`, `WEDDINGSHARE_URL`, `GOOGLE_PLACES_API_KEY`, `GOOGLE_SPREADSHEET_TITLE`, `GOOGLE_CREDENTIALS_FILE`.

Email derivations (`DEFAULT_WEDDING_FROM_EMAIL` etc.) are computed at the bottom of `base.py` — override the bases, not the derived names.

### Secrets

> [!warning] Never commit
> `.env`, `.google-credentials.json`, `.token-oauth`, and `db.sqlite3` are local-only. The `SECRET_KEY` hardcoded in `local.py` is the original upstream key — fine for dev, but production reads `SECRET_KEY` from env.

---

## 7. Data model conventions

- **Currency:** `MoneyField` from `djmoney` for everything price-shaped (`BudgetLineItem.estimated`, `Expense.amount`, vendor `price_low/price_high`).
- **Vendors:** All five comparison models (`VenueOption`, `CatererOption`, `CakeOption`, `FloristOption`, `EntertainmentOption`) inherit from `vendors.models.BaseVendorOption`. New vendor types should extend that base for consistent fields (`name`, `notes`, `rating`, `is_chosen`, `created_at`, `updated_at`, photos via `VendorPhoto`).
- **Selection flag:** Use `is_chosen` (not `is_selected`) — that's the existing convention everywhere.
- **Ordering:** Comparison and list models all expose `ordering` for partner-friendly sorts.
- **Auth on APIs:** `REST_FRAMEWORK['DEFAULT_PERMISSION_CLASSES']` is `IsAuthenticated` with `SessionAuthentication`. New API views default to authenticated; mark public endpoints explicitly.

---

## 8. Google Drive / Sheets sync

`drive_sync` writes a single spreadsheet (default title `Wedding Planning`) with these tabs in order:

`Summary`, `Guests`, `Parties`, `Wedding Party`, `Budget`, `Expenses`, `Schedule`, `Seating Tables`, `Music — Playlist`, `Music — Do Not Play`, `Venues`, `Caterers`, `Cakes`, `Florists`, `Entertainment`.

**Trigger paths:**
- CLI: `python manage.py sync_to_drive [--spreadsheet "Other Title"]`
- HTTP: `POST /drive/sync/` (login-required) — wired from the dashboard button

**Setup:** service account JSON at `.google-credentials.json`; share the target spreadsheet with the service account's `client_email` as Editor.

> [!note] No scheduled sync
> Sync is on-demand only. There is no Celery/Redis in this project. If you need scheduled sync, do it via a cron entry calling the management command — don't reintroduce a broker.

---

## 9. Task provider integration (todos app)

`todos` syncs an existing project from a remote task system into the local `Task` model. Two providers are supported behind a single dispatcher (`todos/provider.py`); pick the active one with `TODO_PROVIDER` (env var or Django setting). Default is `todoist`.

> [!info] Adding a third provider
> Drop a `<name>_client.py` next to the existing two with the same surface (`get_config`, `get_wedding_project_id`, `get_projects`, `sync_tasks_to_db`, `create_task`, `complete_task`, `serialize_task`), register it in `provider._MODULES`, and add a constant + choice to `todos/models.py`. `api_views.py` and `views.py` only talk to `provider`, so they don't need to change.

### Schema

`Task.provider` (`'ticktick' | 'todoist'`) plus `Task.external_id` form a unique pair. Priority is normalised to TickTick's 0/1/3/5 scale at serialize time so the React app stays provider-agnostic.

### Todoist (`TODO_PROVIDER=todoist`, default)

- **Auth:** long-lived personal API token from Todoist → Settings → Integrations → Developer.
- **Config (`base.py`):** `TODOIST_API_TOKEN`, `TODOIST_PROJECT_NAME` (default `Wedding`), `TODOIST_DRAKE_ASSIGNEE`, `TODOIST_SHAWNA_ASSIGNEE`.
- **Setup helper:** `python manage.py todoist_setup` — verifies the token, lists projects, and dumps collaborator IDs for the assignee filter.
- **API used:** Todoist unified API v1 (`https://api.todoist.com/api/v1`) — supersedes REST v2 and Sync v9. List endpoints are cursor-paginated; `_api_get_paginated` walks `next_cursor` for you.
- **Note:** `/tasks` only returns active tasks. Tasks completed/deleted directly in Todoist are detected at sync time and marked `status=2` locally.

### TickTick (`TODO_PROVIDER=ticktick`)

- **Auth:** OAuth2 — register an app at developer.ticktick.com, then `python manage.py ticktick_auth` once to complete the browser flow. Token is auto-refreshed from `.token-oauth`.
- **Config (`base.py`):** `TICKTICK_CLIENT_ID`, `TICKTICK_CLIENT_SECRET`, `TICKTICK_USERNAME`, `TICKTICK_PASSWORD`, `TICKTICK_PROJECT_NAME` (default `Wedding`), `TICKTICK_TOKEN_PATH` (defaults to `.token-oauth`), plus `TICKTICK_DRAKE_ASSIGNEE` / `TICKTICK_SHAWNA_ASSIGNEE`.

### Common

- **Refresh from UI:** `POST /todos/api/sync/` (called by the React todos app on page load).

---

## 10. Common commands

```bash
# Dev — runs both servers
make dev                # Django :8002 + Vite :5173

# Or run them separately
.venv/bin/python manage.py runserver 8002
( cd frontend && npm run dev )

# Prod build (collectstatic + migrate + gunicorn)
make prod

# Migrations
.venv/bin/python manage.py migrate

# Guest list import (CSV format documented in README)
.venv/bin/python manage.py import_guests guestList.csv

# Email blasts
.venv/bin/python manage.py send_save_the_dates --send --mark-sent
.venv/bin/python manage.py send_invitations    --send --mark-sent

# Google Sheets export
.venv/bin/python manage.py sync_to_drive

# TickTick OAuth (one-time)
.venv/bin/python manage.py ticktick_auth
```

---

## 11. When working in this repo

> [!tip] Defaults to follow
> - **Use existing patterns first.** Each app already has `views.py` (templates) + `api_views.py` (DRF). Match that split.
> - **New page = new Vite entry.** Add it to `frontend/vite.config.ts` `rollupOptions.input`, create `frontend/src/<name>/main.tsx`, and `{% vite_asset %}` it from a Django template.
> - **New table that should reach the partner = new sheet.** Add a `_rows_<name>()` to `drive_sync/service.py` and append it to the `sheets` list in `sync_all()`.
> - **Money is always `MoneyField`.** Don't bring back `DecimalField` for prices.
> - **Vendor comparisons inherit `BaseVendorOption`.**
> - **Run migrations after any model change.** Local DB is SQLite by default, so most migrations apply instantly.
> - **No Celery, no Redis, no pandas.** If a problem seems to want them, reach for a management command + cron, or do the work in Python with the stdlib / `gspread` directly.

---

## 12. Out-of-scope / not yet built

Things sometimes asked for that **do not exist yet** — flag rather than assume:

- Dietary restrictions / allergies model
- Dress / makeup-and-hair / florist-arrangement comparison apps (only the five vendor types in §4 exist)
- Gift registry tracker beyond the external `REGISTRY_URL` link
- Background job runner (no Celery)

If asked to add any of these, treat it as a new feature: model + admin + DRF endpoints + React entry + drive_sync rows.
