#!/bin/sh
set -ex

echo "==> Testing with Django dev server..."
python manage.py runserver 0.0.0.0:8000