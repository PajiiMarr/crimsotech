#!/usr/bin/env bash
set -ex  # Add -x for debugging

echo ">>> entrypoint: starting (pid $$)"

# Test Django can start
echo ">>> entrypoint: testing Django"
python manage.py check --deploy

# Collect static files
echo ">>> entrypoint: collecting static files"
python manage.py collectstatic --noinput || true

# Start gunicorn with error capture
echo ">>> entrypoint: starting gunicorn on port ${PORT:-10000}"
exec gunicorn backend.wsgi:application \
  --bind "0.0.0.0:${PORT:-10000}" \
  --workers 1 \
  --timeout 600 \
  --log-level debug \
  --capture-output \
  --enable-stdio-inheritance \
  --access-logfile - \
  --error-logfile -