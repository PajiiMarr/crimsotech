#!/bin/sh
set -e

echo "==> Starting Gunicorn server in background..."
gunicorn backend.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --timeout 600 \
    --log-level info \
    --access-logfile - \
    --error-logfile - &

echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput || true

echo "==> Server is ready!"
wait