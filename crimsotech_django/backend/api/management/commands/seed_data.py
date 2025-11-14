from django.core.management.base import BaseCommand
from api.models import User, Admin
from django.contrib.auth.hashers import make_password

class Command(BaseCommand):
    help = "Seed the database with initial data"

    def handle(self, *args, **kwargs):
        user, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "password": make_password("crimsotech_admin"),
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS("✅ Admin user created successfully!"))
        else:
            self.stdout.write(self.style.WARNING("⚠️ Admin user already exists."))

        admin, admin_created = Admin.objects.get_or_create(
            admin_id=user,
        )

        if admin_created:
            self.stdout.write(self.style.SUCCESS(f"✅ Admin record created for user_id={user.user_id}!"))
        else:
            self.stdout.write(self.style.WARNING("⚠️ Admin record already exists."))
