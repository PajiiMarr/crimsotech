"""
Django settings for backend project.
"""
import os
from pathlib import Path
import environ
import dj_database_url
from corsheaders.defaults import default_headers
import redis  # Added for Redis connection pooling
import base64  # <--- ADD THIS MISSING IMPORT

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
    "10.207.168.15",
    "10.55.244.79",
    "192.168.1.21",
    ".ondigitalocean.app",
]

# Application definition
INSTALLED_APPS = [
    "daphne",
    "channels",
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'api',
    'rest_framework',
    'corsheaders',
    'django_seed',
    'storages'
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
    "https://crimsotech.vercel.app",  # 
]

# WebSocket CORS settings
CORS_ALLOWED_ORIGINS_WEBSOCKETS = [
    "ws://localhost:3000",
    "ws://localhost:5173",
    "ws://127.0.0.1:5173",
    "wss://crimsotech.vercel.app",
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
ASGI_APPLICATION = 'backend.asgi.application'

# Database Configuration
db_url = env.str("DATABASE_URL", default="")
if db_url:
    # Parse database URL with optimized connection age (reduced from 600 to 60)
    db_config = dj_database_url.parse(db_url, conn_max_age=60)  # Reduced for better memory management
    # Add SSL requirement if using Supabase or other cloud providers
    if "supabase.com" in db_url or "pooler.supabase.com" in db_url:
        db_config["OPTIONS"] = {
            "sslmode": "require",
            "connect_timeout": 10,
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
            "CONN_MAX_AGE": 60,  # Reduced for better memory management
            "OPTIONS": {
                "connect_timeout": 10,
            },
        }
    }

# Redis Configuration for Channels
REDIS_URL = env.str("REDIS_URL", default="redis://localhost:6379")

# Redis Connection Pooling Settings
REDIS_POOL_SIZE = env.int("REDIS_POOL_SIZE", default=10)
REDIS_CONNECTION_KWARGS = {
    "socket_keepalive": True,
    "socket_connect_timeout": 5,
    "socket_timeout": 30,
    "retry_on_timeout": True,
    "max_connections": REDIS_POOL_SIZE,
}

# Channel Layers with optimized Redis connection pooling
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [{
                "address": REDIS_URL,
                "ssl_cert_reqs": None,
                **REDIS_CONNECTION_KWARGS  # Add connection pooling
            }],
            "capacity": 100,  # Reduced from 1500 to prevent memory buildup
            "expiry": 30,  # Reduced from 60 seconds
            "symmetric_encryption_keys": [SECRET_KEY],
            "channel_capacity": {
                "http.request": 200,
                "websocket.send*": 100,
            }
        },
    },
}

# For development, you can use in-memory layer (not for production!)
if DEBUG and not REDIS_URL:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
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
        "channels": {  # Add Channels logging
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "channels_redis": {  # Add Redis channel logging
            "handlers": ["console"],
            "level": "WARNING",  # Only log warnings to reduce noise
            "propagate": False,
        },
    },
}

STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {
            "access_key": env.str("SUPABASE_ACCESS_KEY"),
            "secret_key": env.str("SUPABASE_SECRET_KEY"),
            "bucket_name": env.str("SUPABASE_STORAGE_BUCKET"),
            "endpoint_url": env.str("SUPABASE_ENDPOINT"),
            "region_name": env.str("SUPABASE_REGION", default="ap-south-1"),
            "signature_version": "s3v4",
            "addressing_style": "path",
            "default_acl": None,
            "querystring_auth": False,
            # "max_pool_connections": 10,
        },
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

MEDIA_URL = f"{env.str('SUPABASE_ENDPOINT')}/{env.str('SUPABASE_STORAGE_BUCKET')}/"

CHAT_MESSAGE_HISTORY_DAYS = env.int("CHAT_MESSAGE_HISTORY_DAYS", default=30)
MAX_UPLOAD_SIZE = env.int("MAX_UPLOAD_SIZE", default=10485760)
ALLOWED_CHAT_FILE_TYPES = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt']

SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_SAMESITE = 'Lax'  
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SAMESITE = 'Lax'

import gc
gc.set_threshold(700, 10, 5)

ENABLE_SANDBOX = env.bool('ENABLE_SANDBOX', default=False)

# AFTER - uses django-environ like everything else in your settings
MAYA_SANDBOX = {
    'BASE_URL': 'https://pg-sandbox.paymaya.com',
    'PUBLIC_KEY': env.str('MAYA_PUBLIC_KEY', default=''),
    'SECRET_KEY': env.str('MAYA_SECRET_KEY', default=''),
}

def get_maya_auth_header(use_secret=False):
    """
    Generate Basic Auth header for Maya API requests
    """
    key = MAYA_SANDBOX['SECRET_KEY'] if use_secret else MAYA_SANDBOX['PUBLIC_KEY']
    credentials = f"{key}:"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"

FRONTEND_URL = env.str('FRONTEND_URL', default='http://localhost:5173')