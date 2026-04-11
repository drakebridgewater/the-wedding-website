NPM := /Users/drake/.nvm/versions/node/v23.10.0/bin/npm
PYTHON := .venv/bin/python
PIP := .venv/bin/pip
GUNICORN := .venv/bin/gunicorn
DEV_SETTINGS ?= config.settings.local
PROD_SETTINGS ?= config.settings.production

.PHONY: dev prod

dev:
	@trap 'kill 0' SIGINT; \
	$(PIP) install -r requirements/local.txt; \
	$(NPM) --prefix frontend run dev & \
	DJANGO_SETTINGS_MODULE=$(DEV_SETTINGS) $(PYTHON) manage.py runserver 8002 & \
	wait

prod:
	$(PIP) install -r requirements/production.txt
	$(NPM) --prefix frontend run build
	DJANGO_SETTINGS_MODULE=$(PROD_SETTINGS) $(PYTHON) manage.py collectstatic --noinput -v 0
	DJANGO_SETTINGS_MODULE=$(PROD_SETTINGS) $(PYTHON) manage.py migrate
	OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES DJANGO_SETTINGS_MODULE=$(PROD_SETTINGS) $(GUNICORN) config.wsgi:application --bind 0.0.0.0:8002