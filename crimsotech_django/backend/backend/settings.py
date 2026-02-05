"""
Django settings for backend project.
"""
from pathlib import Path
import environ
import dj_database_url
from corsheaders.defaults import default_headers

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# ENV Setup
env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
)

# Read from local .env file if it exists (for development)
local_env = BASE_DIR / "backend" / ".env"
if local_env.exists():
    environ.Env.read_env(local_env)

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env.str('SECRET_KEY', default='unsafe-dev-key')

DEBUG = env.bool('DEBUG', default=False)  # ✅ Read from environment

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",     # web
    "0.0.0.0",        # technically optional, safe to include
    "192.168.254.105",   # your PC LAN IP for mobile
    ".ngrok-free.app",
    "10.55.244.79",
    "192.168.1.21",
    ".ondigitalocean.app",
]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'api',
    'rest_framework',
    'corsheaders',
    'django_seed'
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny']
}

CORS_ORIGIN_ALLOW_ALL = False
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000", 
    "http://localhost:8000",
]
CORS_ALLOW_CREDENTIALS = True

# Allow the frontend to send the custom X-User-Id header in preflight
CORS_ALLOW_HEADERS = list(default_headers) + [
    'x-user-id',
    'X-User-Id',
    'x-shop-id',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

db_url = env.str("DATABASE_URL", default="")
if db_url:
    # Parse database URL with SSL requirements for Supabase/cloud databases
    db_config = dj_database_url.parse(db_url, conn_max_age=600)
    # Add SSL requirement if using Supabase or other cloud providers
    if "supabase.com" in db_url or "pooler.supabase.com" in db_url:
        db_config["OPTIONS"] = {
            "sslmode": "require",
        }
    DATABASES = {
        "default": db_config,
    }
else:
    # Fallback to individual environment variables (for local development)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env.str("POSTGRES_DB", default="crimsotech_database"),
            "USER": env.str("POSTGRES_USER", default="crimsotech_user"),
            "PASSWORD": env.str("POSTGRES_PASSWORD", default=""),
            "HOST": env.str("POSTGRES_HOST", default="127.0.0.1"),
            "PORT": env.str("POSTGRES_PORT", default="5432"),
            "CONN_MAX_AGE": 600,
        }
    }
# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files
MEDIA_URL = env.str("MEDIA_URL", default="/media/")

MEDIA_ROOT = env.str(
    "MEDIA_ROOT",
    default=str(BASE_DIR / "media")
)

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Twilio Configuration
TWILIO_ACCOUNT_SID = env.str('TWILIO_ACCOUNT_SID', default='')
TWILIO_AUTH_TOKEN = env.str('TWILIO_AUTH_TOKEN', default='')
TWILIO_SERVICE_ID = env.str('TWILIO_SERVICE_ID', default='')

# Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
    },
    "formatters": {
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "loggers": {
        "api.views": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}