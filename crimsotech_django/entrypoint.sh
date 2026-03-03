--workers ${WEB_CONCURRENCY:-1}
--threads 1

set -ex

echo ">>> entrypoint: starting (pid $$)"

MEMORY_LIMIT=${MEMORY_AVAILABLE:-512}  # Set this in your app spec
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

echo ">>> seeding data"
python manage.py seed_data

echo ">>> migrating tables..."
python manage.py migrate --noinput

echo ">>> collecting static files"
python manage.py collectstatic --noinput

echo ">>> starting server with WebSocket support"
echo ">>> Workers: $WORKERS, Memory: ${MEMORY_LIMIT}MB"

export DJANGO_SETTINGS_MODULE=backend.settings
export PYTHONUNBUFFERED=TRUE
export PYTHONMALLOC=malloc

exec gunicorn backend.asgi:application \
  -k uvicorn.workers.UvicornWorker \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers $WORKERS \
  --threads 1 \
  --worker-connections $CONCURRENCY \
  --max-requests $MAX_REQUESTS \
  --max-requests-jitter 50 \
  --timeout 120 \  # Reduced from 600
  --log-level info \
  --access-logfile - \
  --error-logfile - \
  --preload