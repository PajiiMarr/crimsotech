#!/usr/bin/env bash
set -ex

echo ">>> entrypoint: starting (pid $$)"

echo ">>> seeding data"
python manage.py seed_data

echo ">>> migrating tables..."
python manage.py migrate --noinput

echo ">>> collecting static files"
python manage.py collectstatic --noinput || true

echo ">>> starting server with WebSocket support"
echo ">>> Redis URL: ${REDIS_URL}"

# Set Django settings module explicitly
export DJANGO_SETTINGS_MODULE=backend.settings

# Use Gunicorn with Uvicorn workers
exec gunicorn backend.asgi:application \
  -k uvicorn.workers.UvicornWorker \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers ${WEB_CONCURRENCY:-1} \
  --threads 1 \
  --worker-connections 1000 \
  --max-requests 1000 \
  --max-requests-jitter 50 \
  --timeout 600 \
  --log-level info \
  --access-logfile - \
  --error-logfile -