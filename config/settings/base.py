import logging
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
# config/settings/base.py is 3 levels deep, so go up 3 times.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

DEFAULT_AUTO_FIELD = "django.db.models.AutoField"

SECRET_KEY = 'u7!-y4k1c6b44q507nr_l+c^12o7ur++cpzyn!$65w^!gum@h%'

ALLOWED_HOSTS = ["my_website_url", "127.0.0.1", "localhost"]
CSRF_TRUSTED_ORIGINS = [
    "http://example.com",
    "https://127.0.0.1",
]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'djmoney',
    'rest_framework',
    'django_vite',
    'guests.apps.GuestsConfig',
    'wedding.apps.WeddingConfig',
    'budget.apps.BudgetConfig',
    'seating.apps.SeatingConfig',
    'schedule.apps.ScheduleConfig',
    'todos.apps.TodosConfig',
    'vendors.apps.VendorsConfig',
    'music.apps.MusicConfig',
    'notes.apps.NotesConfig',
    'drive_sync.apps.DriveSyncConfig',
    'dashboard.apps.DashboardConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            BASE_DIR / 'templates',
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'wedding.context_processors.wedding_settings',
                'config.context_processors.google_places_key',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_L10N = True
USE_TZ = True

STATIC_ROOT = BASE_DIR / 'static_root'
STATIC_URL = '/static/'
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Allow uploads up to 20 MB (hero photos, vendor images)
DATA_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
}

DJANGO_VITE = {
    'default': {
        'dev_mode': False,
        'manifest_path': BASE_DIR / 'static' / 'dist' / '.vite' / 'manifest.json',
        'static_url_prefix': 'dist',
    }
}

# -------------------------
# Wedding-specific settings
# Override these in local.py or via environment variables.
# -------------------------

# Names of the couple, used in emails and templates
BRIDE_AND_GROOM = 'Drake & Shawna'
# Used in links inside save-the-date and invitation emails
WEDDING_WEBSITE_URL = 'https://wedding.bridgewater.digital'
# Base address for all outgoing emails
DEFAULT_WEDDING_EMAIL = 'wedding@drake.bridgewater.digital'
# List of addresses to CC on every outgoing email
WEDDING_CC_LIST = []

# URL for the self-hosted WeddingShare photo-sharing app
# Override in production settings or .env to your public-facing URL
WEDDINGSHARE_URL = 'https://photoshare.drakebridgewater.com'

# ThingsToGetMe gift registry URL (e.g. https://www.thingstogetme.com/your-name-wedding)
# Set to your specific registry URL in production settings or .env
REGISTRY_URL = 'https://www.thingstogetme.com/2201028ac00f5'

# Derived email settings — override the base addresses above, not these
DEFAULT_WEDDING_FROM_EMAIL = f'{BRIDE_AND_GROOM} <{DEFAULT_WEDDING_EMAIL}>'
DEFAULT_WEDDING_TEST_EMAIL = DEFAULT_WEDDING_FROM_EMAIL
DEFAULT_WEDDING_REPLY_EMAIL = DEFAULT_WEDDING_EMAIL

# -------------------------
# Todo provider integration
#
# The todos app can sync against either TickTick or Todoist. Pick which one
# is active with TODO_PROVIDER ('ticktick' | 'todoist'). Settings for each
# provider live below; only the active one needs to be filled in.
# -------------------------

TODO_PROVIDER = 'todoist'  # 'ticktick' or 'todoist'

# --- TickTick ---
# OAuth2: register an app at https://developer.ticktick.com, then run
# `python manage.py ticktick_auth` once to complete the browser flow.
TICKTICK_CLIENT_ID = 'REDACTED_TICKTICK_CLIENT_ID'
TICKTICK_CLIENT_SECRET = 'REDACTED_TICKTICK_CLIENT_SECRET'
TICKTICK_USERNAME = 'drake.bridgewater@gmail.com'
TICKTICK_PASSWORD = 'REDACTED_TICKTICK_PASSWORD'
TICKTICK_PROJECT_NAME = 'Wedding'
TICKTICK_TOKEN_PATH = str(BASE_DIR / '.token-oauth')
# TickTick assignee IDs for the assignee filter. Run `ticktick_auth` to see
# project tasks and find the value in the `assignee` field for each person.
TICKTICK_DRAKE_ASSIGNEE = ''
TICKTICK_SHAWNA_ASSIGNEE = ''

# --- Todoist ---
# Long-lived personal API token. Get one at:
#   Todoist → Settings → Integrations → Developer → "API token"
# No OAuth dance, no refresh — just paste the token.
TODOIST_API_TOKEN = 'REDACTED_TODOIST_API_TOKEN'
TODOIST_PROJECT_NAME = 'Wedding'
# Todoist user (collaborator) IDs for the assignee filter. Run
# `python manage.py todoist_setup` after configuring the token to list them.
TODOIST_DRAKE_ASSIGNEE = ''
TODOIST_SHAWNA_ASSIGNEE = ''

# -------------------------
# Google Drive / Sheets sync
# 1. Create a Google Cloud project, enable Sheets + Drive APIs.
# 2. Create a Service Account and download its JSON credentials file.
# 3. Share the target spreadsheet with the service account email address.
# 4. Run: python manage.py sync_to_drive
# -------------------------
GOOGLE_CREDENTIALS_FILE = str(BASE_DIR / '.google-credentials.json')
GOOGLE_SPREADSHEET_TITLE = 'Wedding Planning'
GOOGLE_PLACES_API_KEY = ''  # Set in .env / production settings for address autocomplete

# -------------------------
# Logging
# -------------------------
class _IgnoreFavicon(logging.Filter):
    # this is mostly an example to show how to set up logging filters, but it also keeps the logs cleaner by ignoring 404 errors for /favicon.ico
    def filter(self, record):
        return '/favicon.ico' not in record.getMessage()


LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'ignore_favicon': {'()': 'config.settings.base._IgnoreFavicon'},
    },
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {name}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
            'filters': ['ignore_favicon'],
        },
    },
    'loggers': {
        # Full tracebacks for 500 errors
        'django.request': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        # TickTick client + API views
        'todos': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
