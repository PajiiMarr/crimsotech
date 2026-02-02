#!/usr/bin/env bash
set -ex

echo ">>> entrypoint: starting (pid $$)"

echo ">>> seeding data"
python manage.py seed_data

echo ">>> migrating tables..."
python manage.py migrate --noinput

# Collect static files
echo ">>> entrypoint: collecting static files"
python manage.py collectstatic --noinput || true

# Start gunicorn - explicitly no config file
echo ">>> entrypoint: starting gunicorn on port ${PORT:-8000}"
exec gunicorn backend.wsgi:application \
  -c python:gunicorn.glogging \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers 1 \
  --timeout 600 \
  --log-level info \
  --access-logfile - \
  --error-logfile -