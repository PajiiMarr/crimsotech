#!/usr/bin/env bash
set -e

echo ">>> entrypoint: starting (pid $$)"

# Collect static files
echo ">>> entrypoint: collecting static files"
python manage.py collectstatic --noinput || true

# Start gunicorn (migrations already done manually)
echo ">>> entrypoint: starting gunicorn on port ${PORT:-10000}"
exec gunicorn backend.wsgi:application \
  --bind "0.0.0.0:${PORT:-10000}" \
  --workers 1 \
  --timeout 600 \
  --access-logfile - \
  --error-logfile -