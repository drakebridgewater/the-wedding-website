from .base import *

DEBUG = True

SECRET_KEY = 'u7!-y4k1c6b44q507nr_l+c^12o7ur++cpzyn!$65w^!gum@h%'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Override with your own details during local development
# BRIDE_AND_GROOM = 'Your Names'
# WEDDING_DATE = 'June 1st, 2025'
# WEDDING_LOCATION = 'Somewhere Special'
# WEDDING_WEBSITE_URL = 'https://yoursite.com'
# DEFAULT_WEDDING_EMAIL = 'you@example.com'
