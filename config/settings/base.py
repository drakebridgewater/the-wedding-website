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
    'guests.apps.GuestsConfig',
    'wedding.apps.WeddingConfig',
    'planning.apps.PlanningConfig',
    'vendors.apps.VendorsConfig',
    'music.apps.MusicConfig',
    'drive_sync.apps.DriveSyncConfig',
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
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

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

# -------------------------
# Wedding-specific settings
# Override these in local.py or via environment variables.
# -------------------------

# Names of the couple, used in emails and templates
BRIDE_AND_GROOM = 'Bride and Groom'
# Date of the wedding, displayed on the site
WEDDING_DATE = 'January 1st, 1969'
# Location of the wedding, displayed on the site
WEDDING_LOCATION = 'North Pole, USA'
# Used in links inside save-the-date and invitation emails
WEDDING_WEBSITE_URL = 'https://thehappycouple.com'
# Base address for all outgoing emails
DEFAULT_WEDDING_EMAIL = 'happilyeverafter@example.com'
# List of addresses to CC on every outgoing email
WEDDING_CC_LIST = []

# Derived email settings — override the base addresses above, not these
DEFAULT_WEDDING_FROM_EMAIL = f'{BRIDE_AND_GROOM} <{DEFAULT_WEDDING_EMAIL}>'
DEFAULT_WEDDING_TEST_EMAIL = DEFAULT_WEDDING_FROM_EMAIL
DEFAULT_WEDDING_REPLY_EMAIL = DEFAULT_WEDDING_EMAIL
