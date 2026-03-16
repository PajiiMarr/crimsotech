from django.contrib import admin

from . import models

Category = models.Category
Customer = models.Customer
Product = models.Product
ProductMedia = models.ProductMedia
Shop = models.Shop
User = models.User
Variants = models.Variants
VariantOptionsModel = getattr(models, "VariantOptions", None)


class ProductMediaInline(admin.TabularInline):
	model = ProductMedia
	extra = 0
	fields = ("file_data", "file_type")


class VariantsInline(admin.TabularInline):
	model = Variants
	extra = 0
	fields = ("title", "shop")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
	list_display = (
		"name",
		"shop",
		"customer",
		"category",
		"upload_status",
		"condition",
		"status",
		"is_removed",
		"created_at",
	)
	list_filter = (
		"upload_status",
		"status",
		"condition",
		"is_removed",
		"is_refundable",
		"created_at",
		"shop",
	)
	search_fields = (
		"name",
		"description",
		"shop__name",
		"customer__customer__username",
		"category__name",
	)
	readonly_fields = ("created_at", "updated_at")
	list_select_related = ("shop", "customer", "category", "category_admin")
	inlines = [ProductMediaInline, VariantsInline]


@admin.register(ProductMedia)
class ProductMediaAdmin(admin.ModelAdmin):
	list_display = ("id", "product", "file_type", "file_data")
	list_filter = ("file_type",)
	search_fields = ("product__name", "product__shop__name")
	list_select_related = ("product",)


@admin.register(Variants)
class VariantsAdmin(admin.ModelAdmin):
	list_display = ("title", "product", "shop", "option_count")
	search_fields = ("title", "product__name", "shop__name")
	list_filter = ("shop",)
	list_select_related = ("product", "shop")

	def option_count(self, obj):
		return obj.variantoptions_set.count()

	option_count.short_description = "Options"


if VariantOptionsModel is not None:
	@admin.register(VariantOptionsModel)
	class VariantOptionsAdmin(admin.ModelAdmin):
		list_display = ("title", "variant", "created_at")
		list_filter = ("created_at",)
		search_fields = ("title", "variant__title", "variant__product__name")
		list_select_related = ("variant",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
	list_display = ("name", "shop", "user")
	list_filter = ("shop",)
	search_fields = ("name", "shop__name", "user__username", "user__email")
	list_select_related = ("shop", "user")


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
	list_display = (
		"name",
		"customer",
		"verified",
		"status",
		"is_suspended",
		"total_sales",
		"created_at",
	)
	list_filter = ("verified", "status", "is_suspended", "created_at")
	search_fields = (
		"name",
		"customer__customer__username",
		"customer__customer__email",
		"contact_number",
	)
	readonly_fields = ("created_at", "updated_at")
	list_select_related = ("customer",)


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
	list_display = ("customer", "current_product_count", "product_limit", "can_add_product")
	search_fields = ("customer__username", "customer__email")


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
	list_display = (
		"username",
		"email",
		"is_admin",
		"is_customer",
		"is_moderator",
		"is_rider",
		"is_suspended",
		"created_at",
	)
	list_filter = (
		"is_admin",
		"is_customer",
		"is_moderator",
		"is_rider",
		"is_suspended",
		"created_at",
	)
	search_fields = ("username", "email", "first_name", "last_name", "contact_number")
	readonly_fields = ("created_at", "updated_at")
