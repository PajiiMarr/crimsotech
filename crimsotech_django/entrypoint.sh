#!/usr/bin/env bash
set -ex

echo ">>> entrypoint: starting (pid $$)"

# Test Django can start
echo ">>> entrypoint: testing Django"
python manage.py check --deploy

# Collect static files
echo ">>> entrypoint: collecting static files"
python manage.py collectstatic --noinput || true

# Start gunicorn - explicitly no config file
echo ">>> entrypoint: starting gunicorn on port ${PORT:-10000}"
exec gunicorn backend.wsgi:application \
  -c python:gunicorn.glogging \
  --bind "0.0.0.0:${PORT:-10000}" \
  --workers 1 \
  --timeout 600 \
  --log-level info \
  --access-logfile - \
  --error-logfile -