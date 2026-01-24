#!/usr/bin/env bash
set -e

echo ">>> entrypoint: starting (pid $$)"

# Run migrations (only if enabled)
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo ">>> entrypoint: running migrations"
  python manage.py migrate --noinput || {
    echo ">>> WARNING: Migrations failed, continuing anyway"
  }
fi

# Collect static files
echo ">>> entrypoint: collecting static files"
python manage.py collectstatic --noinput || true

# Finally exec the CMD (this becomes PID 1)
# If CMD is provided, use it; otherwise use default gunicorn command
if [ $# -eq 0 ]; then
  echo ">>> entrypoint: starting gunicorn on port ${PORT:-10000}"
  exec gunicorn backend.wsgi:application \
    --bind "0.0.0.0:${PORT:-10000}" \
    --workers 3 \
    --timeout 600 \
    --access-logfile - \
    --error-logfile -
else
  echo ">>> entrypoint: exec: $@"
  exec "$@"
fi