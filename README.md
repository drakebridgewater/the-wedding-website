# Wedding Website & Planning Platform

A full wedding planning platform built on Django. Includes a public wedding website, guest management with RSVP tracking, budget tracking, vendor comparisons, seating chart, to-dos, music lists, day-of schedule, and Google Sheets sync so a non-technical partner always has access to current data.

---

## Table of Contents

- [What's Included](#whats-included)
- [Local Development](#local-development)
- [Docker](#docker)
- [Environment Variables](#environment-variables)
- [Customization](#customization)
- [Google Drive Sync](#google-drive--sheets-sync)
- [Guest Management](#guest-management)
- [Sending Email](#sending-email)

---

## What's Included

| Feature | URL |
|---------|-----|
| Public wedding website | `/` |
| Wedding dashboard | `/dashboard/` |
| Guest management | `/guests/` |
| Budget tracker | `/budget/` |
| Budget estimator | `/budget/estimator/` |
| Vendor comparisons (venue, caterer, cake, florist, entertainment) | `/vendors/<type>/` |
| Seating chart | `/seating/` |
| To-do list | `/todos/` |
| Music playlist & do-not-play | `/music/` |
| Day-of schedule | `/schedule/` |
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

### TickTick Integration

Optional. Syncs tasks from a TickTick project into the to-do list. Run `python manage.py ticktick_auth` once to complete OAuth setup.

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

---

## Guest Management

Import guests from a CSV file:

```bash
python manage.py import_guests guestList.csv
```

Expected CSV format:

```
party_name,first_name,last_name,party_type,is_child,category,is_invited,email
Smith Family,John,Smith,formal,n,Friends,y,john@example.com
```

The guest dashboard is at `/dashboard/` — requires a staff or superuser account.

---

## Sending Email

Save-the-dates and invitations can be sent from the guest management section of the dashboard, or via management commands:

```bash
python manage.py send_save_the_dates --send --mark-sent
python manage.py send_invitations --send --mark-sent
```

Use `-h` on either command for all options. For SMTP, set `EMAIL_HOST` and related variables (see [Environment Variables](#environment-variables)).
