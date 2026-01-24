#!/bin/sh
set -ex

# echo "==> Running migrations..."
# python manage.py migrate --noinput

# echo "==> Collecting static files..."
# python manage.py collectstatic --noinput || true

# echo "==> Starting Gunicorn server on port 8000..."
# exec gunicorn backend.wsgi:application \
#     --bind 0.0.0.0:8000 \
#     --workers 1 \
#     --timeout 600 \
#     --log-level debug \
#     --capture-output \
#     --enable-stdio-inheritance \
#     --access-logfile - \
#     --error-logfile -

echo "==> Testing with Django dev server..."
python manage.py runserver 0.0.0.0:8000