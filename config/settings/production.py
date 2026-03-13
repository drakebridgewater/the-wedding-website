import environ

from .base import *

env = environ.Env()
# Read .env if present (not required in Docker — env vars come from docker-compose)
env_file = BASE_DIR / '.env'
if env_file.exists():
    environ.Env.read_env(env_file)

DEBUG = False

SECRET_KEY = env('SECRET_KEY')

ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost'])
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[])

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('POSTGRES_DB'),
        'USER': env('POSTGRES_USER'),
        'PASSWORD': env('POSTGRES_PASSWORD'),
        'HOST': env('POSTGRES_SERVER'),
        'PORT': env('POSTGRES_PORT', default='5432'),
    }
}

# Email — defaults to console if SMTP vars not provided
if env('EMAIL_HOST', default=None):
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = env('EMAIL_HOST')
    EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
    EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
    EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
    EMAIL_PORT = env.int('EMAIL_PORT', default=587)
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Override wedding-specific settings from environment
BRIDE_AND_GROOM = env('BRIDE_AND_GROOM', default=BRIDE_AND_GROOM)
WEDDING_DATE = env('WEDDING_DATE', default=WEDDING_DATE)
WEDDING_LOCATION = env('WEDDING_LOCATION', default=WEDDING_LOCATION)
WEDDING_WEBSITE_URL = env('WEDDING_WEBSITE_URL', default=WEDDING_WEBSITE_URL)
DEFAULT_WEDDING_EMAIL = env('DEFAULT_WEDDING_EMAIL', default=DEFAULT_WEDDING_EMAIL)

DEFAULT_WEDDING_FROM_EMAIL = f'{BRIDE_AND_GROOM} <{DEFAULT_WEDDING_EMAIL}>'
DEFAULT_WEDDING_TEST_EMAIL = DEFAULT_WEDDING_FROM_EMAIL
DEFAULT_WEDDING_REPLY_EMAIL = DEFAULT_WEDDING_EMAIL

TICKTICK_CLIENT_ID = env('TICKTICK_CLIENT_ID', default='')
TICKTICK_CLIENT_SECRET = env('TICKTICK_CLIENT_SECRET', default='')
TICKTICK_USERNAME = env('TICKTICK_USERNAME', default='')
TICKTICK_PASSWORD = env('TICKTICK_PASSWORD', default='')
TICKTICK_PROJECT_NAME = env('TICKTICK_PROJECT_NAME', default='Wedding')
