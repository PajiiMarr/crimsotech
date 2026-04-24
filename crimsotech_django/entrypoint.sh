#!/usr/bin/env bash
set -ex

echo ">>> entrypoint: starting (pid $$)"

# Calculate optimal workers based on available memory
MEMORY_LIMIT=${MEMORY_AVAILABLE:-512}
if [ $MEMORY_LIMIT -le 512 ]; then
    WORKERS=1
    MAX_REQUESTS=500
    CONCURRENCY=100
elif [ $MEMORY_LIMIT -le 1024 ]; then
    WORKERS=2
    MAX_REQUESTS=750
    CONCURRENCY=200
else
    WORKERS=3
    MAX_REQUESTS=1000
    CONCURRENCY=400
fi

echo ">>> flushing database"
python manage.py flush --noinput

echo ">>> seeding data"
python manage.py seed_data

echo ">>> migrating tables..."
python manage.py migrate --noinput

echo ">>> collecting static files"
python manage.py collectstatic --noinput

# echo ">>> seeding category data"
# python manage.py seed_data

echo ">>> starting server with WebSocket support"s
echo ">>> Workers: $WORKERS, Memory: ${MEMORY_LIMIT}MB"

# Set Django settings module explicitly
export DJANGO_SETTINGS_MODULE=backend.settings
export PYTHONUNBUFFERED=TRUE
export PYTHONMALLOC=malloc

# Fixed: Removed comment after backslash
exec gunicorn backend.asgi:application \
  -k uvicorn.workers.UvicornWorker \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers $WORKERS \
  --threads 1 \
  --worker-connections $CONCURRENCY \
  --max-requests $MAX_REQUESTS \
  --max-requests-jitter 50 \
  --timeout 120 \
  --log-level info \
  --access-logfile - \
  --error-logfile - \
  --preload