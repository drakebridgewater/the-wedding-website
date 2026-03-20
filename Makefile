NPM := /Users/drake/.nvm/versions/node/v23.10.0/bin/npm
PYTHON := .venv/bin/python
PIP := .venv/bin/pip
SETTINGS ?= config.settings.local

.PHONY: dev

dev:
	@trap 'kill 0' SIGINT; \
	$(PIP) install -r requirements/local.txt; \
	$(NPM) --prefix frontend run dev & \
	DJANGO_SETTINGS_MODULE=$(SETTINGS) $(PYTHON) manage.py runserver 8002 & \
	wait
