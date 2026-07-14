# Wedding Website & Planning Platform

A complete wedding platform built on Django 4.2 with React 18 islands. It has two halves:

- **A public wedding website** for guests — home page with countdown, RSVP flow with per-guest meal choices, an animated save-the-date card, wedding party page, day-of program, honeymoon fund with guestbook, moderated Q&A, and name-gated guest-only content.
- **A private planning platform** for the couple — dashboard with milestones, guest & email management, budget tracker and estimator, vendor comparisons, drag-and-drop seating chart, schedule builder, to-dos (synced with Todoist or TickTick), sticky notes, a Pinterest-style idea board, and music lists.

Everything can be exported on demand to a single Google Spreadsheet, so a non-technical partner always has a readable copy of the data.

Originally forked from [czue/django-wedding-website](https://github.com/czue/django-wedding-website) and heavily extended.

---

## Table of Contents

- [Page Map](#page-map)
- [The Public Website](#the-public-website)
- [The Planning Platform](#the-planning-platform)
- [Editing Site Content](#editing-site-content)
- [Local Development](#local-development)
- [Docker & Production](#docker--production)
- [Environment Variables](#environment-variables)
- [Guest List Import & Export](#guest-list-import--export)
- [Email System](#email-system)
- [Google Drive / Sheets Sync](#google-drive--sheets-sync)
- [Task Provider Integration](#task-provider-integration-todoist--ticktick)
- [Pinterest Integration](#pinterest-integration)
- [Management Commands](#management-commands)

---

## Page Map

### Public (guest-facing)

| Page | URL |
|------|-----|
| Home — hero, countdown, event details, registry, proposal story, Q&A | `/` |
| Wedding party | `/party/` |
| Honeymoon fund | `/honeymoon/` |
| Day-of program | `/schedule/program/` |
| RSVP / invitation (unique per party) | `/invite/<id>/` |
| Animated save-the-date card (unique per party) | `/std/<id>/` |
| Contact details confirmation form (unique per party) | `/details/<id>/` |
| Privacy policy | `/privacy/` |

### Planning (login required)

| Page | URL |
|------|-----|
| Dashboard — stats, milestones, sync button | `/dashboard/` |
| Guest management — contacts, wedding party, rehearsal dinner, seating, emails | `/guests/manage/` |
| Budget tracker | `/budget/` |
| Budget estimator | `/budget/estimator/` |
| Vendor comparisons | `/vendors/venue/`, `/vendors/caterer/`, `/vendors/cake/`, `/vendors/florist/`, `/vendors/entertainment/` |
| Seating chart | `/seating/` |
| Day-of schedule builder | `/schedule/` |
| Schedule groups & group email | `/schedule/groups/` |
| To-dos / Notes / Idea board (three tabs on one page) | `/todos/` (`#notes`, `#ideas`) |
| Music playlist & do-not-play | `/music/` |
| Guest CSV export | `/guests/export` |
| Django admin | `/admin/` |
| Login / logout / password | `/accounts/` |

Each interactive page is a Django template that mounts a React app (built with Vite); JSON APIs live under each app's `api/` routes and require a logged-in session.

---

## The Public Website

### Home page

A single scrolling page composed of sections: hero photo, welcome, **countdown timers** (driven by the exact ceremony datetime), event details, location, "good to know," gifts (registry link + honeymoon fund), the proposal story, **Ask Us Anything**, and contact. Section text, photos, colors, and the countdown are all editable in the admin — see [Editing Site Content](#editing-site-content).

### Guest-only content & the unlock prompt

Sensitive-ish content (travel directions, registry, honeymoon fund payment handles, photo sharing, Q&A) is hidden from anonymous visitors. Guests unlock it either by:

- **Opening any personal link** from an email (invitation, save-the-date card, details form) — this also remembers *which* party they are, or
- **Typing their name** (guest "First Last" or party name) into the unlock prompt. An exact match grants full access; an ambiguous match unlocks content but hides party-specific links.

Access is session-based and lasts ~90 days. Logged-in staff always see everything.

### RSVP flow

Every party gets a unique invitation link (`/invite/<id>/`). The RSVP form supports:

- Per-guest **attending yes/no**, **meal choice** (options managed in the admin), and **dietary restrictions**
- Party-level **comments** and a **"we'd like a physical card"** checkbox
- **Mailing address** collection with Google Places autocomplete — structured street/city/state/zip/country components plus a "verified" flag when the guest picked a suggestion
- A confirmation page after submitting

The first open of an invitation is timestamped (`invitation_opened`), as is the RSVP response time — both visible in the planning UI.

### Save-the-date card & contact details form

- `/std/<id>/` serves an **animated save-the-date card** per party, with curated photo strips and a lightbox. Photos are resized ahead of time from camera originals in `photo_masters/` (see [`build_std_photos`](#management-commands)). The card links to that party's contact details form.
- `/details/<id>/` is a **contact details form** (linked from save-the-date emails) where a party can correct their names, emails, phone numbers, and mailing address. Changes apply immediately and every edit is logged as a `ContactUpdate` (before/after values, reviewable in the admin).
- First visits to either page stamp `save_the_date_opened` — an open receipt for the save-the-date email.

### Wedding party page

`/party/` shows wedding party members marked public: bride's side and groom's side in columns, honor attendants labeled, officiant/others centered below. Members (photo, bio, role, ordering) are managed from the planning UI.

### Honeymoon fund

`/honeymoon/` shows payment handles (Venmo, Zelle, Cash App, PayPal — whichever are configured) and a guestbook. Guests can leave a message; messages are emailed to the couple and appear on the page once approved in the admin.

### Ask Us Anything

Guests submit questions from the home page. Each submission emails the couple with a direct admin approval link; approved questions (with answers) render on the site.

### Photo sharing

The nav links to a self-hosted [WeddingShare](https://github.com/Cirx08/WeddingShare) instance (`WEDDINGSHARE_URL`) for guest photo uploads — shown only to unlocked guests.

---

## The Planning Platform

All planning pages require login (Django auth at `/accounts/login/`).

### Dashboard (`/dashboard/`)

Overview stats across guests, budget, vendors, seating, music, and tasks; days-remaining until the RSVP deadline (with overdue flagging); a **milestone checklist** (venue/caterer/cake/florist/entertainment chosen, RSVP deadline set, save-the-dates sent, invitations sent, …) with links to fix each gap; and a **Sync to Drive** button.

### Guest management (`/guests/manage/`)

One React app with five tabs:

- **Contacts** — full party/guest CRUD: statuses (planned / invited / not invited), categories, bride/groom side, per-guest email/phone/meal/dietary/child flags, plus-one allowances, rehearsal dinner flag, addresses, RSVP state, save-the-date & invitation sent/opened timestamps. Filter by guest label or rehearsal-dinner membership, with live search. Import CSVs directly from the UI.
- **Wedding Party** — manage members (role, photo, bio, contact info, schedule color, display order), link them to guest records, track "have we asked them yet" (`is_informed`) and whether they show on the public page.
- **Rehearsal Dinner** — read-only roster of everyone whose party is flagged for the rehearsal dinner, with attendance badges and meal choices.
- **Seating** — assign guests to tables from within the guests app (the full drag-and-drop chart lives at `/seating/`).
- **Emails** — the template editor and send flow described under [Email System](#email-system).

### Budget (`/budget/` and `/budget/estimator/`)

- **Tracker** — budget categories (editable, with API CRUD) containing line items (`estimated` money) and itemized **expenses** (actual spend), with summary charts of estimated vs. actual.
- **Estimator** — pick a guest count and a tier (budget / standard / luxury) to generate a per-category estimate, then **import the estimate** into the real budget in one click.

All money fields use `django-money`.

### Vendor comparisons (`/vendors/<type>/`)

Five vendor types — venue, caterer, cake, florist, entertainment — sharing one comparison UI. Each option tracks contact info (website/phone/email/address), a price estimate, a 1–5 rating, pros/cons/notes, and pipeline flags (favorite, talked-to, visited, **chosen**), plus:

- **Photos** — upload directly, or **scrape** them from the vendor's website by URL
- **Documents** — attach contracts/quotes per vendor
- **Checklist** — per-vendor-type question checklist to ask every candidate
- **Map** — vendor locations plotted with Leaflet

### Seating chart (`/seating/`)

A venue floor plan on a configurable grid (dimensions and real-world cell size in feet) with round or square tables of any capacity, positioned and sized on the grid. Guests are assigned by **drag-and-drop** (or batch assignment) with per-guest color coding. Assignments live on the guest record so they flow to exports.

### Schedule (`/schedule/`)

Multi-day schedule builder: days contain events with times, locations, notes, and **attendees** (wedding party members, color-coded). Events marked public appear on the guest-facing program at `/schedule/program/`. The **groups page** (`/schedule/groups/`) manages named groups of wedding party members and can **send a group email** to everyone in a group.

### To-dos, Notes & Idea board (`/todos/`)

Three tabs on one page:

- **To-Dos** — tasks synced from Todoist or TickTick (see [Task Provider Integration](#task-provider-integration-todoist--ticktick)): list, filter by assignee/status/priority, create, and complete — changes push back to the provider. Syncs automatically on page load.
- **Notes** — colored sticky notes with full CRUD.
- **Idea Board** — Pinterest-style inspiration board. Add ideas three ways: **upload** an image, **paste any URL** (the page's `og:image` is fetched and stored locally — works for Pinterest pin links too, no API needed), or **sync a Pinterest board** via the official API (see [Pinterest Integration](#pinterest-integration)). Ideas support tags, favorites, source filtering, and search. Images are stored locally under `media/ideas/`.

### Music (`/music/`)

Playlist and **do-not-play** lists. Add songs by searching **MusicBrainz** or by pasting a YouTube/Spotify/SoundCloud link; each song is tagged with the **moment** it belongs to (prelude, ceremony, cocktail hour, dinner, dance, …) and keeps notes and ordering.

---

## Editing Site Content

Public-site content lives in the database and is edited in the Django admin (`/admin/`) — no template edits needed for day-to-day changes:

- **Wedding Settings** (singleton) — couple/bride/groom names, hero title & photo, human-readable date, **exact ceremony datetime** (drives the countdown timers), location, support email, website URL, Google Analytics ID, **RSVP deadline** (drives dashboard alerts), color **theme**, registry card text, honeymoon fund text and payment handles, proposal banner photo.
- **Themes** — named accent color palettes for the public site; switch the active one in Wedding Settings.
- **Page Section Items** — ordered, publishable content blocks for the Welcome / Event / Getting There / Good to Know / Proposal sections. ("Getting There" renders only for unlocked guests.)
- **Meal Options** — the meal choices offered on the RSVP form; deactivating hides an option without breaking existing responses.
- **Questions** and **Fund Messages** — moderation queues for guest Q&A and honeymoon guestbook submissions.
- **Contact Updates** — audit log of guest-submitted contact corrections.

The hero photo can also be swapped from the site itself when logged in (`POST /upload/hero/`).

Deployment-level values (couple names used in emails, site URL, from-address, registry URL) have env-var overrides — see [Environment Variables](#environment-variables).

---

## Local Development

Requires Python 3.12+ and Node.js 20+.

**1. Create and activate a virtual environment**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

**2. Install Python dependencies**

```bash
pip install -r requirements/local.txt
```

**3. Install frontend dependencies**

```bash
cd frontend && npm install && cd ..
```

**4. Set up the database and create a superuser**

```bash
python manage.py migrate
python manage.py createsuperuser
```

**5. Start both servers**

```bash
make dev
```

This starts the Django dev server on `http://localhost:8002` and the Vite dev server on `http://localhost:5173`. Both must be running for the site to look correct — Ctrl+C stops both.

> Local dev uses SQLite and logs email to the console by default. No Postgres or Redis needed.

**Alternatively, start them separately:**

```bash
# Terminal 1
python manage.py runserver 8002

# Terminal 2
cd frontend && npm run dev
```

---

## Docker & Production

A GitHub Actions workflow builds the image on every push to `master` and publishes it to `ghcr.io` (see `.github/workflows/docker-publish.yml`). `docker-compose.yml` pulls that image (or builds locally with `docker compose build`), and the container entrypoint:

1. Waits for Postgres to accept connections
2. Runs `collectstatic` and `migrate`
3. Creates the superuser from `DJANGO_SUPERUSER_*` (no-op if it exists)
4. Starts nginx + gunicorn (long request timeout so the ~2-minute Sheets sync survives)

An external PostgreSQL database is required (not included in the compose file). Media uploads and data persist to host volumes under `DATA_DIR`. The compose file also carries Traefik labels for HTTPS routing and domain canonicalization — adapt or delete them for your proxy setup.

**1. Create a `.env` file** in the project root (see [Environment Variables](#environment-variables)):

```env
SECRET_KEY=your-secret-key-here

POSTGRES_DB=wedding
POSTGRES_USER=wedding
POSTGRES_PASSWORD=changeme
POSTGRES_SERVER=your-postgres-host
POSTGRES_PORT=5432

DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@example.com
DJANGO_SUPERUSER_PASSWORD=changeme

APP_PORT=8080
DATA_DIR=/srv/wedding
```

**2. Build and start**

```bash
docker compose up --build   # or: make redeploy
```

Visit `http://localhost:8080`.

**Without Docker**, `make prod` installs production requirements, builds the frontend, runs `collectstatic` + `migrate`, and serves gunicorn on `:8002` using `config.settings.production`.

---

## Environment Variables

All variables are read from a `.env` file at the project root (production settings) or passed by docker-compose. In local dev, override settings in `config/settings/local.py` instead. The `.env` file is never committed.

### Required (production)

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key — generate with `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `POSTGRES_DB` | PostgreSQL database name |
| `POSTGRES_USER` | PostgreSQL username |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `POSTGRES_SERVER` | PostgreSQL host |
| `POSTGRES_PORT` | PostgreSQL port (default: `5432`) |

### Django / Hosting

| Variable | Default | Description |
|----------|---------|-------------|
| `ALLOWED_HOSTS` | `localhost` | Comma-separated list of allowed hostnames |
| `CSRF_TRUSTED_ORIGINS` | _(empty)_ | Comma-separated list of trusted origins (e.g. `https://yourdomain.com`) |
| `APP_PORT` | `8080` | Host port exposed by Docker |
| `DATA_DIR` | — | Host directory for the `media/` and `data/` volumes (Docker) |
| `DJANGO_SUPERUSER_USERNAME` / `_EMAIL` / `_PASSWORD` | — | Auto-created admin account (Docker entrypoint) |

### Wedding Details

| Variable | Default | Description |
|----------|---------|-------------|
| `BRIDE_AND_GROOM` | `Drake & Shawna` | Couple's names — used in emails and templates |
| `WEDDING_WEBSITE_URL` | _(project URL)_ | Public URL used in email links |
| `DEFAULT_WEDDING_EMAIL` | _(project email)_ | From/reply address for outgoing emails |
| `REGISTRY_URL` | _(ThingsToGetMe URL)_ | Gift registry link shown on the site |
| `WEDDINGSHARE_URL` | _(project URL)_ | URL to self-hosted WeddingShare photo app |

> The wedding **date**, **location**, countdown datetime, RSVP deadline, payment handles, and all page copy are *not* environment variables — they live in the **Wedding Settings** admin page (see [Editing Site Content](#editing-site-content)).

### Google

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_PLACES_API_KEY` | _(unset)_ | Enables address autocomplete on the RSVP and contact-details forms |
| `GOOGLE_CREDENTIALS_FILE` | `.google-credentials.json` | Path to the service-account JSON for Sheets sync |

### Email (SMTP)

If `EMAIL_HOST` is not set, email falls back to the console backend. All are optional.

| Variable | Default | Description |
|----------|---------|-------------|
| `EMAIL_HOST` | _(unset)_ | SMTP server hostname — setting this enables SMTP |
| `EMAIL_PORT` | `587` | SMTP port |
| `EMAIL_USE_TLS` | `true` | Enable STARTTLS |
| `EMAIL_USE_SSL` | `false` | Enable SSL/TLS (mutually exclusive with TLS) |
| `EMAIL_HOST_USER` | _(empty)_ | SMTP username |
| `EMAIL_HOST_PASSWORD` | _(empty)_ | SMTP password |
| `EMAIL_TIMEOUT` | `10` | Connection timeout in seconds |

### Task Providers

Set `TODO_PROVIDER` to `todoist` (default) or `ticktick`, then fill in that provider's variables — details under [Task Provider Integration](#task-provider-integration-todoist--ticktick).

| Variable | Default | Description |
|----------|---------|-------------|
| `TODO_PROVIDER` | `todoist` | Which task system the todos app syncs with |
| `TODOIST_API_TOKEN` | _(unset)_ | Personal API token from Todoist |
| `TODOIST_PROJECT_NAME` | `Wedding` | Todoist project to sync |
| `TODOIST_DRAKE_ASSIGNEE` / `TODOIST_SHAWNA_ASSIGNEE` | _(unset)_ | Collaborator IDs for the assignee filter |
| `TICKTICK_CLIENT_ID` / `TICKTICK_CLIENT_SECRET` | _(unset)_ | OAuth app credentials from developer.ticktick.com |
| `TICKTICK_USERNAME` / `TICKTICK_PASSWORD` | _(unset)_ | TickTick account credentials |
| `TICKTICK_PROJECT_NAME` | `Wedding` | TickTick project to sync |

### Pinterest (Idea Board sync)

Configured in Django settings (`config/settings/base.py` or `local.py`): `PINTEREST_CLIENT_ID`, `PINTEREST_CLIENT_SECRET`, `PINTEREST_REDIRECT_URI`, `PINTEREST_BOARD_ID`. See [Pinterest Integration](#pinterest-integration).

### Local Dev — Postgres Override

By default, local dev uses SQLite. To use Postgres locally, set any of these (the others get sensible defaults):

| Variable | Default | Description |
|----------|---------|-------------|
| `PGHOST` or `DB_HOST` | _(unset)_ | Setting either switches local dev to Postgres |
| `PGDATABASE` or `DB_NAME` | `wedding` | Database name |
| `PGUSER` or `DB_USER` | `postgres` | Username |
| `PGPASSWORD` or `DB_PASSWORD` | _(empty)_ | Password |
| `PGPORT` or `DB_PORT` | `5432` | Port |

---

## Guest List Import & Export

**Import** from the Contacts tab in the UI, or via CLI:

```bash
python manage.py import_guests guestList.csv
```

Two CSV formats are auto-detected by their headers:

- **Native format** — required: `first_name`, `last_name`; optional: `party_name`, `party_type`, `is_child`, `category`, `is_invited`, `email`:

  ```
  party_name,first_name,last_name,party_type,is_child,category,is_invited,email
  Smith Family,John,Smith,formal,n,Friends,y,john@example.com
  ```

- **Google Contacts export** — export contacts from Google as CSV and import directly; names, emails, and phones are mapped automatically.

**Export** the full guest list as CSV from `/guests/export` (login required).

---

## Email System

All guest email is managed from the **Emails tab** of `/guests/manage/`.

### Templates

Rich-text templates (Tiptap editor) with:

- **Purpose** — Save the Date / Invitation / Other. Sending a save-the-date or invitation template automatically stamps the matching sent-date on each party (which drives the dashboard milestones and "already got it" badges).
- **Merge fields**, rendered as labeled pills in the editor: `{{party_name}}`, `{{first_name}}`, `{{rsvp_link}}`, `{{details_link}}`, `{{save_the_date_link}}`, `{{couple}}`, `{{date}}`, `{{location}}`, `{{site_url}}`
- **Header image** (optionally hyperlinked to the save-the-date card, RSVP page, details form, or site), an optional **RSVP button** and secondary **"see more" button** with per-template colors, plus background/font colors and a footer.

### Sending & guardrails

- **Live preview** against any real party (unsaved edits included) rendered in a sandboxed iframe
- **Test send** to any single address (prefixed `[Test]`, never CC'd or logged)
- Party checklist with **"no email" badges**, **"✓ got it" badges**, a **double-send warning**, and an **"everyone still waiting" smart-select**
- Every real send is logged (`SentEmail`: template, party, rendered content, recipients, who sent it, when) and browsable per-party and globally

### CLI sending

```bash
python manage.py send_save_the_dates --send --mark-sent
python manage.py send_invitations    --send --mark-sent
```

To change the default spreadsheet title, set `GOOGLE_SPREADSHEET_TITLE` in `config/settings/base.py` or `local.py`, or via the `GOOGLE_SPREADSHEET_TITLE` environment variable in production.

The animated card at `/std/<id>/` shows curated photo strips. Camera originals live in `photo_masters/` (outside the static tree, never shipped); the strips to display are defined in `SAVE_THE_DATE_CARD_STRIPS` in `guests/views.py`. After changing photos, regenerate the resized derivatives and commit them:

```bash
python manage.py build_std_photos
```

---

## Google Drive / Sheets Sync

All wedding data can be exported to a Google Spreadsheet on demand — one-way, database → Sheets.

**Setup**

1. Go to [console.cloud.google.com](https://console.cloud.google.com/), create a project, and enable the **Google Sheets API** and **Google Drive API**.
2. Go to **IAM & Admin → Service Accounts → Create Service Account**, then under **Keys → Add Key → Create new key → JSON**, download the credentials file.
3. Save it as `.google-credentials.json` in the project root (never commit this file).
4. Create a Google Sheet named **"Wedding Planning"**, click **Share**, and give the service account email (found under `client_email` in the JSON) **Editor** access.

**Run the sync**

```bash
python manage.py sync_to_drive
# or override the spreadsheet name:
python manage.py sync_to_drive --spreadsheet "My Wedding"
```

To change the default title, set `GOOGLE_SPREADSHEET_TITLE` in settings.

The sync writes these tabs: `Summary`, `Guests`, `Parties`, `Wedding Party`, `Budget`, `Expenses`, `Schedule`, `Seating Tables`, `Music — Playlist`, `Music — Do Not Play`, `Ideas`, `Venues`, `Caterers`, `Cakes`, `Florists`, `Entertainment`.

Sync can also be triggered from the dashboard's **Sync to Drive** button (`POST /drive/sync/`, login required); `GET /drive/info/` returns service-account storage diagnostics. There is no scheduled sync — use cron with the management command if you want one.

---

## Task Provider Integration (Todoist / TickTick)

The to-do list at `/todos/` syncs an existing project from a remote task system into the local `Task` model, and pushes creates/completes back. Pick the provider with `TODO_PROVIDER`.

**Todoist** (default, `TODO_PROVIDER=todoist`)

1. Get a personal API token from Todoist → Settings → Integrations → Developer.
2. Set `TODOIST_API_TOKEN` in your environment.
3. Run `python manage.py todoist_setup` to verify connectivity, list projects, and print collaborator IDs for the assignee filter.

Tasks completed or deleted directly in Todoist are detected at sync time and marked done locally.

**TickTick** (`TODO_PROVIDER=ticktick`)

1. Register an app at developer.ticktick.com.
2. Set `TICKTICK_CLIENT_ID` and `TICKTICK_CLIENT_SECRET`.
3. Run `python manage.py ticktick_auth` once to complete the browser-based OAuth flow (token auto-refreshes from `.token-oauth`).

**Refreshing from the UI:** the React app calls `POST /todos/api/sync/` on page load; there's also a manual refresh.

Adding a third provider means dropping a `<name>_client.py` next to the existing two with the same function surface and registering it in `todos/provider.py`.

---

## Pinterest Integration

The idea board can sync a Pinterest board via the official API (mirrors the TickTick OAuth pattern):

1. Register an app at [developers.pinterest.com](https://developers.pinterest.com) (the `/privacy/` page on this site exists to satisfy their app review).
2. Set `PINTEREST_CLIENT_ID`, `PINTEREST_CLIENT_SECRET`, `PINTEREST_REDIRECT_URI`, and `PINTEREST_BOARD_ID` in Django settings.
3. Run `python manage.py pinterest_auth` once — it completes the browser OAuth flow, stores the token in `.pinterest-token` (auto-refreshed), and prints your board IDs.
4. Sync from the Idea Board UI (`POST /ideas/api/pinterest/sync/`).

Pins are deduplicated on their Pinterest pin ID, so re-syncing only imports new pins. A **trial-mode** Pinterest app can read your own boards, which is all this needs; arbitrary public boards would require Pinterest's standard-access review.

> No Pinterest account? Pasting a pin URL into the board's "add by URL" flow fetches the image without any API setup.

---

## Management Commands

| Command | Purpose |
|---------|---------|
| `import_guests <file.csv>` | Import the guest list (native or Google Contacts CSV) |
| `send_save_the_dates [--send --mark-sent]` | Send save-the-date emails (dry-run without `--send`) |
| `send_invitations [--send --mark-sent]` | Send invitation emails (dry-run without `--send`) |
| `build_std_photos [--force]` | Regenerate resized save-the-date card photos from `photo_masters/` |
| `sync_to_drive [--spreadsheet "Title"]` | Export everything to the Google Spreadsheet |
| `todoist_setup` | Verify the Todoist token, list projects and collaborator IDs |
| `ticktick_auth` | One-time TickTick OAuth browser flow |
| `pinterest_auth` | One-time Pinterest OAuth browser flow; prints board IDs |

Run any command with `-h` for full options. Use `.venv/bin/python manage.py <cmd>` if the virtualenv isn't activated.
