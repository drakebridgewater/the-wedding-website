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

# Create the superuser

python manage.py createsuperuser --noinput

/usr/sbin/nginx -g 'daemon off;' &

gunicorn config.wsgi --bind 0.0.0.0:8000