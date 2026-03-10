# backend/api/tasks.py
from celery import shared_task
from django.core.management import call_command

@shared_task
def assign_deliveries_task():
    call_command('assign_deliveries')

@shared_task
def check_delivery_responses_task():
    call_command('check_delivery_responses')

