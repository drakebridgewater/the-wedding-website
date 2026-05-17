# Wedding Website & Planning Platform

A full wedding planning platform built on Django. Includes a public wedding website, guest management with RSVP tracking, budget tracking, vendor comparisons, seating chart, to-dos, music lists, day-of schedule, notes, and Google Sheets sync so a non-technical partner always has access to current data.

---

## Table of Contents

- [What's Included](#whats-included)
- [Local Development](#local-development)
- [Docker](#docker)
- [Environment Variables](#environment-variables)
- [Customization](#customization)
- [Google Drive / Sheets Sync](#google-drive--sheets-sync)
- [Guest Management](#guest-management)
- [Sending Email](#sending-email)
- [Task Provider Integration](#task-provider-integration)

---

## What's Included

| Feature | URL |
|---------|-----|
| Public wedding website | `/` |
| Wedding dashboard | `/dashboard/` |
| Guest management | `/guests/manage/` |
| Budget tracker | `/budget/` |
| Budget estimator | `/budget/estimator/` |
| Vendor comparisons (venue, caterer, cake, florist, entertainment) | `/vendors/<type>/` |
| Seating chart | `/seating/` |
| To-do list | `/todos/` |
| Notes | `/notes/` |
| Music playlist & do-not-play | `/music/` |
| Day-of schedule | `/schedule/` |
| Public day-of program | `/schedule/program/` |
| Django admin | `/admin/` |

---

## Local Development

Requires Python 3.12+ and Node.js 18+.

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

## Docker

The Docker setup runs Django + gunicorn with a pre-built frontend. It requires an external PostgreSQL database (not included in `docker-compose.yml`).

**1. Create a `.env` file** in the project root (see [Environment Variables](#environment-variables) below for all options):

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
```

**2. Build and start**

```bash
docker-compose up --build
```

Visit `http://localhost:8080`. On first start, migrations run and the superuser is created automatically.

> To add a Postgres container locally, add a `db` service to `docker-compose.yml` and point `POSTGRES_SERVER` at it.

---

## Environment Variables

All variables are read from a `.env` file at the project root (production) or from `config/settings/local.py` (development). The `.env` file is never committed.

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

### Superuser Auto-Creation (Docker)

| Variable | Description |
|----------|-------------|
| `DJANGO_SUPERUSER_USERNAME` | Username for the auto-created admin account |
| `DJANGO_SUPERUSER_EMAIL` | Email for the auto-created admin account |
| `DJANGO_SUPERUSER_PASSWORD` | Password for the auto-created admin account |

### Wedding Details

These override the defaults in `config/settings/base.py`. Can be set in `.env` (production) or `config/settings/local.py` (dev).

| Variable | Default | Description |
|----------|---------|-------------|
| `BRIDE_AND_GROOM` | `Drake & Shawna` | Couple's names — used in emails and templates |
| `WEDDING_DATE` | `January 1st, 1969` | Display date shown on the site |
| `WEDDING_LOCATION` | `North Pole, USA` | Display location shown on the site |
| `WEDDING_WEBSITE_URL` | `https://thehappycouple.com` | Public URL used in email links |
| `DEFAULT_WEDDING_EMAIL` | `happilyeverafter@example.com` | From/reply address for outgoing emails |
| `REGISTRY_URL` | _(ThingsToGetMe URL)_ | Gift registry link shown on the site |
| `WEDDINGSHARE_URL` | `http://10.0.0.10:5123` | URL to self-hosted WeddingShare photo app |

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

### Local Dev — Postgres Override

By default, local dev uses SQLite. To use Postgres locally, set any of these (the others get sensible defaults):

| Variable | Default | Description |
|----------|---------|-------------|
| `PGHOST` or `DB_HOST` | _(unset)_ | Setting either switches local dev to Postgres |
| `PGDATABASE` or `DB_NAME` | `wedding` | Database name |
| `PGUSER` or `DB_USER` | `postgres` | Username |
| `PGPASSWORD` or `DB_PASSWORD` | _(empty)_ | Password |
| `PGPORT` or `DB_PORT` | `5432` | Port |

### Todoist Integration

Optional. Syncs tasks from a Todoist project. Set `TODO_PROVIDER=todoist` (this is the default). Get a personal API token from Todoist → Settings → Integrations → Developer. Run `python manage.py todoist_setup` to verify and list collaborator IDs.

| Variable | Default | Description |
|----------|---------|-------------|
| `TODOIST_API_TOKEN` | _(unset)_ | Personal API token from Todoist |
| `TODOIST_PROJECT_NAME` | `Wedding` | Name of the Todoist project to sync |
| `TODOIST_DRAKE_ASSIGNEE` | _(unset)_ | Collaborator ID for Drake (for filtering) |
| `TODOIST_SHAWNA_ASSIGNEE` | _(unset)_ | Collaborator ID for Shawna (for filtering) |

### TickTick Integration

Optional. Alternative task provider. Set `TODO_PROVIDER=ticktick` and run `python manage.py ticktick_auth` once to complete OAuth setup.

| Variable | Description |
|----------|-------------|
| `TICKTICK_CLIENT_ID` | OAuth client ID from TickTick developer settings |
| `TICKTICK_CLIENT_SECRET` | OAuth client secret |
| `TICKTICK_USERNAME` | TickTick account email |
| `TICKTICK_PASSWORD` | TickTick account password |
| `TICKTICK_PROJECT_NAME` | Name of the TickTick project to sync (default: `Wedding`) |

---

## Customization

Wedding-specific details (names, date, venue, etc.) live in `config/settings/base.py`. Override them for local dev in `config/settings/local.py` (not committed to git):

```python
# config/settings/local.py
BRIDE_AND_GROOM = 'Your Names'
WEDDING_DATE = 'June 1st, 2025'
WEDDING_LOCATION = 'Somewhere Special'
WEDDING_WEBSITE_URL = 'https://yoursite.com'
DEFAULT_WEDDING_EMAIL = 'you@example.com'
```

The public website content lives in templates inside the `wedding/` app. Search for any text on the site to find where it lives.

---

## Google Drive / Sheets Sync

All wedding data can be exported to a Google Spreadsheet on demand.

**Setup**

1. Go to [console.cloud.google.com](https://console.cloud.google.com/), create a project, and enable the **Google Sheets API** and **Google Drive API**.
2. Go to **IAM & Admin → Service Accounts → Create Service Account**, then under **Keys → Add Key → Create new key → JSON**, download the credentials file.
3. Save it as `.google-credentials.json` in the project root (never commit this file).
4. Create a Google Sheet named **"Wedding Planning"**, click **Share**, and give the service account email (found under `client_email` in the JSON) **Editor** access.

**Run the sync**

```bash
python manage.py sync_to_drive
```

To override the spreadsheet name:

```bash
python manage.py sync_to_drive --spreadsheet "My Wedding"
```

To change the default spreadsheet title, set `GOOGLE_SPREADSHEET_TITLE` in `config/settings/base.py` or `local.py`.

The sync writes these tabs: `Summary`, `Guests`, `Parties`, `Wedding Party`, `Budget`, `Expenses`, `Schedule`, `Seating Tables`, `Music — Playlist`, `Music — Do Not Play`, `Venues`, `Caterers`, `Cakes`, `Florists`, `Entertainment`.

Sync can also be triggered from the dashboard via the **Sync to Drive** button (`POST /drive/sync/`, login required).

---

## Guest Management

The guest management app lives at `/guests/manage/` and has three tabs.

### Contacts tab

Lists all parties and guests. Supports filtering by status (planned / invited / not invited), category, and side (bride/groom/both). Guest details include name, email, meal choice, dietary restrictions, RSVP status, and seating table assignment.

**Import guests from CSV:**

```bash
python manage.py import_guests guestList.csv
```

Expected CSV format:

```
party_name,first_name,last_name,party_type,is_child,category,is_invited,email
Smith Family,John,Smith,formal,n,Friends,y,john@example.com
```

Alternatively, upload a CSV directly from the Contacts tab in the UI.

**Export guest list:**

```bash
# CLI
python manage.py export_guests

# Or download from: /guests/export
```

### Emails tab

Create and manage rich-text email templates for invitations and other communications. Templates support:

- Rich text body (Tiptap editor — bold, italic, links, lists)
- Optional header image upload
- Merge fields: `{{party_name}}`, `{{first_name}}`, `{{rsvp_link}}`, `{{couple}}`

Send a template to any subset of parties from the checklist. Each send is logged in the sent-email history (visible per-party and globally).

API endpoints:

| Method | Path | Description |
|--------|------|-------------|
| `GET/POST` | `/guests/api/email-templates/` | List or create templates |
| `GET/PUT/DELETE` | `/guests/api/email-templates/<pk>/` | Retrieve, update, or delete a template |
| `POST` | `/guests/api/email-templates/<pk>/preview/` | Preview rendered with dummy data |
| `POST` | `/guests/api/email-templates/<pk>/send/` | Send to `{ "party_ids": [...] }` |
| `POST` | `/guests/api/email-templates/<pk>/upload-image/` | Upload header image |
| `GET` | `/guests/api/sent-emails/` | Full send log (filter by `?party=<id>`) |

### Save the Date tab

Dedicated send flow for save-the-date emails. Customize the email appearance before sending:

- Upload a header photo
- Pick background and text colors
- Select parties from the checklist (shows prior send date per party)
- Sent history is tracked and displayed

The save-the-date email template lives in `guests/templates/guests/email_templates/save_the_date.html`. Appearance settings (image, colors) are persisted to `SaveTheDateSettings` in the database and managed through the UI.

Send via management command (no appearance customization):

```bash
python manage.py send_save_the_dates --send --mark-sent
```

---

## Sending Email

Invitations can be sent from the **Emails tab** of the guest management app, or via the management command:

```bash
python manage.py send_invitations --send --mark-sent
```

Use `-h` on either command for all options.

Each invitation uses a unique per-party link (`/invite/<id>/`). Guests RSVP at that URL and their response is recorded.

For SMTP, set `EMAIL_HOST` and related variables (see [Environment Variables](#environment-variables)). Without it, all email is logged to the console.

---

## Task Provider Integration

The to-do list at `/todos/` syncs tasks from an external task manager into the local `Task` model. Set the active provider with `TODO_PROVIDER` in your environment or settings.

**Todoist** (default, `TODO_PROVIDER=todoist`)

1. Get a personal API token from Todoist → Settings → Integrations → Developer.
2. Set `TODOIST_API_TOKEN` in your environment.
3. Run `python manage.py todoist_setup` to verify connectivity and get collaborator IDs.

**TickTick** (`TODO_PROVIDER=ticktick`)

1. Register an app at developer.ticktick.com.
2. Set `TICKTICK_CLIENT_ID` and `TICKTICK_CLIENT_SECRET`.
3. Run `python manage.py ticktick_auth` once to complete the browser-based OAuth flow.

**Refreshing from the UI:** The React app calls `POST /todos/api/sync/` on page load to pull the latest tasks. You can also call it manually to force a refresh.
