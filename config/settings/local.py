from .base import *

DEBUG = True

SECRET_KEY = 'u7!-y4k1c6b44q507nr_l+c^12o7ur++cpzyn!$65w^!gum@h%'

import os

_pg_host = os.environ.get('PGHOST') or os.environ.get('DB_HOST')
if _pg_host:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('PGDATABASE') or os.environ.get('DB_NAME', 'wedding'),
            'USER': os.environ.get('PGUSER') or os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('PGPASSWORD') or os.environ.get('DB_PASSWORD', ''),
            'HOST': _pg_host,
            'PORT': os.environ.get('PGPORT') or os.environ.get('DB_PORT', '5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

DJANGO_VITE = {
    'default': {
        'dev_mode': True,
        'dev_server_port': 5173,
    }
}

# Override with your own details during local development
# BRIDE_AND_GROOM = 'Your Names'
# WEDDING_DATE = 'June 1st, 2025'
# WEDDING_LOCATION = 'Somewhere Special'
# WEDDING_WEBSITE_URL = 'https://yoursite.com'
# DEFAULT_WEDDING_EMAIL = 'you@example.com'
