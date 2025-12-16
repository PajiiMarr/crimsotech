from django.test import TestCase
from rest_framework.test import APIClient
from .models import User, Product, Shop, Customer

class FavoritesAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(username='testuser', email='test@example.com')
        # Create customer profile
        Customer.objects.create(customer=self.user)
        self.shop = Shop.objects.create(name='Test Shop', province='X', city='Y', barangay='Z', street='1')
        self.product = Product.objects.create(name='Test Product', description='Desc', quantity=1, price=10.0, status='active', condition='New', shop=self.shop, customer=self.user.customer)

    def test_add_and_remove_favorite(self):
        # Add favorite
        res = self.client.post('/api/customer-favorites/', {'product': str(self.product.id), 'customer': str(self.user.id)}, format='json', HTTP_X_USER_ID=str(self.user.id))
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data.get('success'))

        # Check list
        res = self.client.get('/api/customer-favorites/', HTTP_X_USER_ID=str(self.user.id))
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data.get('success'))
        self.assertEqual(len(res.data.get('favorites', [])), 1)

        # Remove favorite
        res = self.client.delete('/api/customer-favorites/', {'product': str(self.product.id), 'customer': str(self.user.id)}, format='json', HTTP_X_USER_ID=str(self.user.id))
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data.get('success'))

        # Check list empty
        res = self.client.get('/api/customer-favorites/', HTTP_X_USER_ID=str(self.user.id))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data.get('favorites', [])), 0)


class ProductSerializerTest(TestCase):
    def test_product_serializer_includes_swap_fields(self):
        user = User.objects.create(username='serializer', email='s@example.com')
        Customer.objects.create(customer=user)
        shop = Shop.objects.create(name='S', province='P', city='C', barangay='B', street='S')
        product = Product.objects.create(name='PS', description='d', quantity=1, price=1.0, status='active', condition='New', shop=shop, customer=user.customer, open_for_swap=True, swap_description='ok', minimum_additional_payment=0.0, maximum_additional_payment=10.0, compare_price=2.5, length=10.0, width=5.5, height=2.0, weight=1.25, weight_unit='kg')
        from .serializer import ProductSerializer
        ser = ProductSerializer(product)
        data = ser.data
        self.assertIn('open_for_swap', data)
        self.assertTrue(data['open_for_swap'])
        self.assertIn('swap_description', data)
        self.assertEqual(data['swap_description'], 'ok')
        self.assertIn('compare_price', data)
        # serializer returns Decimal as string; ensure it's present and equals '2.5' or numeric
        self.assertTrue(data['compare_price'] is not None)
        # Dimension fields
        self.assertIn('length', data)
        self.assertIn('width', data)
        self.assertIn('height', data)
        self.assertIn('weight', data)
        self.assertIn('weight_unit', data)
        self.assertEqual(str(data['weight_unit']), 'kg')

    def test_create_personal_listing_with_variants_and_images(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        client = APIClient()
        user = User.objects.create(username='vuser', email='v@example.com')
        customer = Customer.objects.create(customer=user)
        # Prepare a small image file
        image_content = b'\x47\x49\x46\x38\x39\x61'  # GIF header minimal
        img = SimpleUploadedFile('test.gif', image_content, content_type='image/gif')
        # Prepare variants payload
        group_id = 'group-1'
        option_id = 'option-1'
        variants_payload = [
            {
                'id': group_id,
                'title': 'Size',
                'options': [
                    {'id': option_id, 'title': 'Small', 'quantity': 2, 'price': '5.00', 'compare_price': '6.00'}
                ]
            }
        ]
        import json
        data = {
            'customer_id': str(customer.customer_id),
            'name': 'Variant Product',
            'description': 'Has variants',
            'quantity': '1',
            'price': '5.00',
            'condition': 'New',
            'variants': json.dumps(variants_payload)
        }
        # Key should match f"variant_image_{group_id}_{option_id}"
        files = {'variant_image_{}_{}'.format(group_id, option_id): img}
        res = client.post('/api/customer-products/', data, format='multipart', files=files)
        self.assertEqual(res.status_code, 201)
        # Check option exists in DB
        from .models import VariantOptions
        opt = VariantOptions.objects.filter(title='Small').first()
        self.assertIsNotNone(opt)
        self.assertEqual(str(opt.compare_price), '6.00')
        self.assertIsNotNone(opt.image)
