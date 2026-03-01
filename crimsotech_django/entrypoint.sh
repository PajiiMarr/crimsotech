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

# Use Gunicorn with Uvicorn workers for best WebSocket performance
exec gunicorn backend.asgi:application \
  -k uvicorn.workers.UvicornWorker \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers ${WEB_CONCURRENCY:-2} \
  --threads ${WEB_THREADS:-2} \
  --worker-connections 1000 \
  --max-requests 1000 \
  --max-requests-jitter 50 \
  --timeout 600 \
  --log-level info \
  --access-logfile - \
  --error-logfile - \
  --access-logformat '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'