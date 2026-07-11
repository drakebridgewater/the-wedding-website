#!/bin/bash

# Wait for Postgres to be ready before running migrations
echo "Waiting for Postgres..."
until python -c "
import os, psycopg2
try:
    psycopg2.connect(
        dbname=os.environ['POSTGRES_DB'],
        user=os.environ['POSTGRES_USER'],
        password=os.environ['POSTGRES_PASSWORD'],
        host=os.environ['POSTGRES_SERVER'],
        port=os.environ.get('POSTGRES_PORT', '5432'),
        connect_timeout=1,
    ).close()
except Exception:
    exit(1)
" 2>/dev/null; do
  sleep 1
done
echo "Postgres is ready."

python manage.py collectstatic --noinput

# i commit my migration files to git so i dont need to run it on server
# ./manage.py makemigrations app_name
python manage.py migrate

# Create the superuser (no-op if already exists)
python manage.py createsuperuser --noinput 2>/dev/null || true

/usr/sbin/nginx -g 'daemon off;' &

# --timeout 300: the Google Sheets sync request legitimately runs ~2 min
#   (it sleeps between sheet writes to stay under the Sheets 60 writes/min quota).
# --workers 2 --threads 4: keep serving other requests while a sync is running.
gunicorn config.wsgi --bind 0.0.0.0:8000 --timeout 300 --workers 2 --threads 4