"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include 
from api.views import * 
from rest_framework.routers import DefaultRouter
from django.conf.urls.static import static
from django.conf import settings

router = DefaultRouter()
router.register(r'verify', VerifyNumber, basename='verify')
router.register(r'rider', RiderRegistration, basename='rider')
router.register(r'admin-products', AdminProduct, basename='admin-products')
router.register(r'admin-shops', AdminShops, basename='admin-shops')
router.register(r'admin-boosting', AdminBoosting, basename='admin-boosting')


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('', UserView.as_view(), name='user-list'),
    path('api/register/', Register.as_view(), name='register'),
    path('api/login/', Login.as_view(), name='login'),
    path('api/profiling/', Profiling.as_view(), name='profiling'),
    path('api/get-role/', GetRole.as_view(), name='get-role'),
    path('api/get-registration/', GetRegistration.as_view(), name='get-registration'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
