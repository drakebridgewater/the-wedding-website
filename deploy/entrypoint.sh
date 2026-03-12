#!/bin/bash

# Wait for Postgres to be ready before running migrations
echo "Waiting for Postgres..."
until python manage.py dbshell -- -c "SELECT 1" > /dev/null 2>&1; do
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