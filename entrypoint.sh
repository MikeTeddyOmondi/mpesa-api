#!/bin/sh

python manage.py makeigrations --no-input
python manage.py migrate --no-input
python manage.py collectstatic --no-input

gunicorn mpesa_api.wsgi:application --bind 0.0.0.0:8000