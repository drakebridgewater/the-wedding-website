# Wedding Website — AI Instructions

## Project Overview

This is a fork of [czue/django-wedding-website](https://github.com/czue/django-wedding-website), extended into a full wedding planning platform. The goal is a polished Django-based app that serves as the central planning hub, with automatic Google Drive/Sheets sync so a non-technical partner can always see the latest data in a familiar spreadsheet interface.

## Architecture

**Source of truth:** PostgreSQL database
**Partner-friendly mirror:** Google Drive / Google Sheets (published on demand or on a schedule)

Changes flow one way by default: Postgres → Sheets. Sheets data can optionally be imported back via management commands (similar to the existing `import_guests` CSV flow).

## Tech Stack

### Backend (Python/Django)
- Python 3, Django 4.2
- PostgreSQL (primary database)
- **Google Sheets sync:** `gspread` + `google-auth-oauthlib`
- **Admin import/export:** `django-import-export`
- **Currency/budget fields:** `django-money`
- **Background jobs/scheduling:** `celery` + `redis` + `django-celery-beat`
- **Data transformation:** `pandas`
- **Dev utilities:** `django-extensions`

### Frontend (JavaScript)
- **UI components:** shadcn/ui (built on Radix UI + Tailwind)
- **Styling:** tailwindcss + clsx + tailwind-merge
- **Data tables:** @tanstack/react-table (vendor comparisons, guest lists, budget)
- **Server state:** @tanstack/react-query
- **Forms:** react-hook-form + zod
- **Drag-and-drop:** @dnd-kit/core + @dnd-kit/sortable (seating chart)
- **Charts:** recharts (budget breakdowns, estimates vs. actuals)
- **Dates:** date-fns
- **Client state:** zustand
- **Notifications:** sonner

## Planned Pages / Features

### Already Exists
- Guest management (Party + Guest models, RSVP, meal selection)
- Save-the-date emails
- Invitation emails with unique URLs
- Guest dashboard

### To Build

| Page | Description |
|------|-------------|
| **Budget** | Itemized budget with actual vs. estimated costs, categories, vendor links |
| **Budget Estimator** | Calculator to project total costs based on guest count + service tiers |
| **To-Dos** | Task list with assignee, due date, status, category |
| **Venue Comparison** | Side-by-side venue options with fields: cost, capacity, style, location, notes, rating |
| **Caterer Comparison** | Compare caterers: price per head, menu options, tasting status, rating, notes |
| **Cake Comparison** | Compare bakeries: flavors, price per tier, tasting notes, photos |
| **Florist** | Florist options with arrangement types, price estimates, photos, notes |
| **Entertainment** | DJ/band options with package details, pricing, sample links, notes |
| **Dresses** | Dress options/shortlist with designer, price, store, fitting status, photos |
| **Makeup & Hair** | Artist options with portfolio links, pricing, trial status, notes |
| **Gifts** | Gift registry tracker — items, store, price, claimed status, thank-you sent |
| **Music** | Song list organized by moment (ceremony, cocktail, reception, first dance, etc.) |
| **Music Do-Nots** | Songs explicitly excluded from the playlist |
| **Seating Chart** | Drag-and-drop table/guest assignment interface |
| **Day-of Schedule** | Timeline of events with time, location, responsible person, notes |

## Google Drive Sync Strategy

- Management command: `python manage.py sync_to_drive` — pushes all key data to Google Sheets
- Admin dashboard button for on-demand sync (accessible at `/dashboard/`)
- Celery beat task for optional scheduled sync (configurable interval)
- Each major data type maps to its own Sheet tab: Guests, Budget, Vendors, Tasks, Music, Seating, Timeline

**What syncs to Sheets:**
- Guest list + RSVP status
- Budget line items
- All vendor comparison tables
- Task/to-do list
- Music lists
- Seating assignments
- Day-of timeline

**What stays Postgres-only:**
- Auth, sessions, invitation tracking
- Email send history and open tracking

## Project Structure

```
the-wedding-website/
├── config/                    # Project configuration (not an app)
│   ├── settings/
│   │   ├── base.py            # Shared settings — edit wedding details here
│   │   ├── local.py           # Local dev: SQLite, console email, DEBUG=True
│   │   └── production.py      # Production: Postgres, SMTP, DEBUG=False (env vars)
│   ├── urls.py                # Root URL routing
│   ├── wsgi.py                # WSGI entry point (production)
│   └── asgi.py                # ASGI entry point
├── guests/                    # Guest management, RSVP, email sending
├── wedding/                   # Public-facing wedding website (home page)
├── planning/                  # Budget, todos, seating chart, day-of timeline
├── vendors/                   # Venue/caterer/cake/florist/entertainment comparisons
├── music/                     # Song lists (play list + do-not-play list)
├── drive_sync/                # Google Sheets sync service
├── templates/                 # Project-wide base templates and partials
├── static/                    # Project-wide static files (CSS, JS, images)
├── requirements/
│   ├── base.txt               # Shared dependencies
│   ├── local.txt              # Dev extras
│   └── production.txt         # Prod extras (gunicorn)
├── manage.py
├── Dockerfile
└── docker-compose.yml
```

## Settings

- **Local development:** `config/settings/local.py` — uses SQLite, console email
- **Production:** `config/settings/production.py` — reads all sensitive values from environment variables / `.env` file
- **Wedding-specific defaults** (names, date, location, URLs) live in `config/settings/base.py`
- `manage.py` defaults to `config.settings.local`; production uses `config.settings.production`

## Data Model Conventions

- Use `django-money`'s `MoneyField` for all currency values
- Use `django-import-export` mixins on all admin classes for CSV/Excel export
- All comparison models share a base structure: `name`, `notes`, `rating` (1–5), `is_selected` (boolean), `created_at`, `updated_at`
- All list models support ordering so the partner can sort rows

## Development Notes

- Google Drive credentials and other secrets go in a `.env` file at the project root — never commit it
- App templates live inside each app's `templates/` folder; base/shared templates live in `templates/` at root
- Run migrations after any model change: `python manage.py migrate`
- Docker Compose will include Postgres, Redis (for Celery), and the Django app

## Running Locally

```bash
pip install -r requirements/local.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

With Docker:
```bash
docker-compose up --build
```
