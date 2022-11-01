#!/bin/sh

#python manage.py migrate --noinput
python manage.py migrate --no-input
python manage.py collectstatic --no-input

gunicorn todo_django_api.wsgi:application --bind 0.0.0.0:8000