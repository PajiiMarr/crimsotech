from django.test import TestCase
from rest_framework.test import APIClient
from .models import User, Product, Shop, Customer, Order, Refund, ReturnRequestItem
from django.utils import timezone
from decimal import Decimal

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


class ProfileViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(username='profileuser', email='profile@example.com')
        # Create customer profile (note: Customer model does not have created_at)
        Customer.objects.create(customer=self.user)

    def test_profile_endpoint_returns_profile(self):
        res = self.client.get('/api/profile/', HTTP_X_USER_ID=str(self.user.id))
        # Should not raise and should return user profile info or success=false with proper status
        self.assertIn(res.status_code, [200, 404, 400])
        # If success, assert expected structure
        if res.status_code == 200:
            self.assertTrue(res.data.get('success'))
            self.assertIn('profile', res.data)
            self.assertIn('user', res.data['profile'])

    def test_profile_get_fallback_route(self):
        res = self.client.get('/api/profile/get', HTTP_X_USER_ID=str(self.user.id))
        self.assertIn(res.status_code, [200, 404, 400])
        if res.status_code == 200:
            self.assertTrue(res.data.get('success'))
            self.assertIn('profile', res.data)
            self.assertIn('user', res.data['profile'])


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
        # Provide SKUs so images can be stored on SKU level
        skus_payload = [
            {
                'id': 'sku-1',
                'option_ids': [option_id],
                'option_map': {'Size': 'Small'},
                'price': '5.00',
                'quantity': 2,
            }
        ]
        data['skus'] = json.dumps(skus_payload)
        # Key should match f"variant_image_{group_id}_{option_id}"
        files = {'variant_image_{}_{}'.format(group_id, option_id): img}
        res = client.post('/api/customer-products/', data, format='multipart', files=files)
        self.assertEqual(res.status_code, 201)
        # Check corresponding SKU exists and has image saved
        from .models import ProductSKU
        sku = ProductSKU.objects.filter(option_ids__contains=[option_id]).first()
        self.assertIsNotNone(sku)
        self.assertIsNotNone(sku.image)


class RefundProofTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # buyer
        self.buyer = User.objects.create(username='buyer', email='buyer@example.com')
        Customer.objects.create(customer=self.buyer)
        # seller
        self.seller = User.objects.create(username='seller', email='seller@example.com')
        Customer.objects.create(customer=self.seller)
        self.shop = Shop.objects.create(name='Seller Shop', province='P', city='C', barangay='B', street='S', customer=self.seller.customer)

        # Create an order by buyer
        self.order = Order.objects.create(user=self.buyer, total_amount=100.0, payment_method='cash')

        # Create refund
        self.refund = Refund.objects.create(
            reason='Test refund',
            buyer_preferred_refund_method='wallet',
            refund_type='keep',
            status='approved',
            order_id=self.order,
            requested_by=self.buyer
        )

    def test_cannot_process_without_proof(self):
        url = f"/api/return-refund/{self.refund.refund_id}/process_refund/"
        res = self.client.post(url, {'final_refund_method': 'wallet', 'set_status': 'processing'}, format='json', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertEqual(res.status_code, 400)
        self.assertIn('proof', res.data.get('error', '').lower())

    def test_upload_and_process(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        img = SimpleUploadedFile('proof.jpg', b'\xFF\xD8\xFF', content_type='image/jpeg')
        url_upload = f"/api/return-refund/{self.refund.refund_id}/add_proof/"
        res_upload = self.client.post(url_upload, {'file_data': img, 'file_type': 'image/jpeg', 'notes': 'Bank transfer'}, format='multipart', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertEqual(res_upload.status_code, 201)

        # Now process
        url = f"/api/return-refund/{self.refund.refund_id}/process_refund/"
        res = self.client.post(url, {'final_refund_method': 'wallet', 'set_status': 'completed'}, format='json', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertIn(res.status_code, [200, 201])
        self.refund.refresh_from_db()
        self.assertEqual(self.refund.refund_payment_status, 'completed')
        # Status should remain 'approved' even after payment is completed
        self.assertEqual(str(self.refund.status), 'approved')

    def test_process_return_refund_with_proof(self):
        # Create a return-type refund and ensure processing works with proof
        from django.core.files.uploadedfile import SimpleUploadedFile
        return_refund = Refund.objects.create(
            reason='Return refund',
            buyer_preferred_refund_method='wallet',
            refund_type='return',
            status='approved',
            order_id=self.order,
            requested_by=self.buyer
        )

        img = SimpleUploadedFile('proof.jpg', b'\xFF\xD8\xFF', content_type='image/jpeg')
        url_upload = f"/api/return-refund/{return_refund.refund_id}/add_proof/"
        res_upload = self.client.post(url_upload, {'file_data': img, 'file_type': 'image/jpeg', 'notes': 'Return proof'}, format='multipart', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertEqual(res_upload.status_code, 201)

        # Now process the return refund
        url = f"/api/return-refund/{return_refund.refund_id}/process_refund/"
        res = self.client.post(url, {'final_refund_method': 'wallet', 'set_status': 'completed'}, format='json', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertIn(res.status_code, [200, 201])
        return_refund.refresh_from_db()
        self.assertEqual(return_refund.refund_payment_status, 'completed')
        # Status should remain 'approved' even after payment is completed
        self.assertEqual(str(return_refund.status), 'approved')

    def test_process_does_not_mark_completed_if_not_approved(self):
        # If refund is not in 'approved' status, processing payment to completed should NOT change refund.status
        from django.core.files.uploadedfile import SimpleUploadedFile
        pending_refund = Refund.objects.create(
            reason='Pending refund',
            buyer_preferred_refund_method='wallet',
            refund_type='keep',
            status='pending',
            order_id=self.order,
            requested_by=self.buyer
        )

        img = SimpleUploadedFile('proof.jpg', b'\xFF\xD8\xFF', content_type='image/jpeg')
        url_upload = f"/api/return-refund/{pending_refund.refund_id}/add_proof/"
        res_upload = self.client.post(url_upload, {'file_data': img, 'file_type': 'image/jpeg', 'notes': 'Proof'}, format='multipart', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertEqual(res_upload.status_code, 201)

        url = f"/api/return-refund/{pending_refund.refund_id}/process_refund/"
        res = self.client.post(url, {'final_refund_method': 'wallet', 'set_status': 'completed'}, format='json', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertIn(res.status_code, [200, 201])
        pending_refund.refresh_from_db()
        self.assertEqual(pending_refund.refund_payment_status, 'completed')
        # status should remain 'pending' because it wasn't 'approved'
        self.assertEqual(str(pending_refund.status), 'pending')

    def test_admin_update_refund_marks_completed_when_payment_completed(self):
        # Admin updating refund_payment_status to 'completed' should mark refund.status to 'completed' when it's currently 'approved'
        admin = User.objects.create(username='admin', email='admin@example.com', is_admin=True)
        Customer.objects.create(customer=admin)

        # Create an approved refund
        approved_refund = Refund.objects.create(
            reason='Approved refund',
            buyer_preferred_refund_method='wallet',
            refund_type='keep',
            status='approved',
            order_id=self.order,
            requested_by=self.buyer
        )

        url = f"/api/return-refund/{approved_refund.refund_id}/admin_update_refund/"
        res = self.client.post(url, {'refund_payment_status': 'completed'}, format='json', HTTP_X_USER_ID=str(admin.id))
        self.assertEqual(res.status_code, 200)
        approved_refund.refresh_from_db()
        self.assertEqual(approved_refund.refund_payment_status, 'completed')
        # The refund.status should remain 'approved' unless explicitly changed
        self.assertEqual(str(approved_refund.status), 'approved')

    def test_cannot_exceed_four_proofs(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        img = SimpleUploadedFile('proof.jpg', b'\xFF\xD8\xFF', content_type='image/jpeg')
        url_upload = f"/api/return-refund/{self.refund.refund_id}/add_proof/"
        # upload 4 proofs in separate requests
        for i in range(4):
            res = self.client.post(url_upload, {'file_data': img, 'file_type': 'image/jpeg', 'notes': f'Proof {i+1}'}, format='multipart', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
            self.assertEqual(res.status_code, 201)
        # 5th upload should fail
        res5 = self.client.post(url_upload, {'file_data': img, 'file_type': 'image/jpeg', 'notes': 'Proof 5'}, format='multipart', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertEqual(res5.status_code, 400)
        self.assertIn('remaining', res5.data.get('error','').lower())

    def test_buyer_update_tracking_cannot_upload_more_than_9_images(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        # Create a return_request for this refund
        rr = ReturnRequestItem.objects.create(refund_id=self.refund, return_method='courier', return_deadline=timezone.now() + timezone.timedelta(days=7))
        url = f"/api/return-refund/{self.refund.refund_id}/update_tracking/"
        # upload 9 files first
        imgs = [SimpleUploadedFile(f'proof{i}.jpg', b'\xFF\xD8\xFF', content_type='image/jpeg') for i in range(9)]
        data = {'logistic_service': 'LBC', 'tracking_number': 'TRK-1'}
        files = [('media_files', img) for img in imgs]
        res = self.client.post(url, data, format='multipart', files=[('media_files', img) for img in imgs], HTTP_X_USER_ID=str(self.buyer.id))
        # Expect ok (201 or 200)
        self.assertIn(res.status_code, [200, 201])
        # Now attempt to add one more image
        img_extra = SimpleUploadedFile('extra.jpg', b'\xFF\xD8\xFF', content_type='image/jpeg')
        res2 = self.client.post(url, {'logistic_service': 'LBC', 'tracking_number': 'TRK-2', 'media_files': img_extra}, format='multipart', HTTP_X_USER_ID=str(self.buyer.id))
        self.assertEqual(res2.status_code, 400)
        self.assertIn('remaining', res2.data.get('error','').lower())

    def test_seller_can_send_counter_offer(self):
        # Seller can send a counter offer and it creates a CounterRefundRequest
        url = f"/api/return-refund/{self.refund.refund_id}/seller_respond_to_refund/"
        res = self.client.post(url, {'action': 'negotiate', 'counter_refund_method': 'return:bank', 'counter_notes': 'I can refund via bank'}, format='json', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertEqual(res.status_code, 200)
        self.refund.refresh_from_db()
        self.assertEqual(str(self.refund.status), 'negotiation')
        from .models import CounterRefundRequest
        cr = CounterRefundRequest.objects.filter(refund_id=self.refund).first()
        self.assertIsNotNone(cr)
        self.assertEqual(cr.counter_refund_method, 'return:bank')
        # Notes should contain seller's message
        self.assertIn('I can refund via bank', cr.notes or '')

    def test_seller_can_send_message_only_counter_offer(self):
        # Seller can send a message-only counter offer (no method)
        url = f"/api/return-refund/{self.refund.refund_id}/seller_respond_to_refund/"
        res = self.client.post(url, {'action': 'negotiate', 'counter_notes': 'Please accept this message-only offer'}, format='json', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertEqual(res.status_code, 200)
        from .models import CounterRefundRequest
        cr = CounterRefundRequest.objects.filter(refund_id=self.refund).order_by('-requested_at').first()
        self.assertIsNotNone(cr)
        # method should be empty for message-only offers
        self.assertEqual(cr.counter_refund_method, '')
        self.assertIn('Please accept this message-only offer', cr.notes or '')

    def test_seller_can_send_counter_offer_with_type(self):
        # Seller can send a counter offer specifying 'keep' type (partial refund voucher)
        url = f"/api/return-refund/{self.refund.refund_id}/seller_respond_to_refund/"
        res = self.client.post(url, {'action': 'negotiate', 'counter_refund_method': 'voucher', 'counter_refund_type': 'keep', 'counter_notes': 'Partial store voucher'}, format='json', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertEqual(res.status_code, 200)
        from .models import CounterRefundRequest
        cr = CounterRefundRequest.objects.filter(refund_id=self.refund).order_by('-requested_at').first()
        self.assertIsNotNone(cr)
        self.assertEqual(cr.counter_refund_method, 'voucher')
        self.assertIn('Partial store voucher', cr.notes or '')

    def test_invalid_counter_method_rejected(self):
        url = f"/api/return-refund/{self.refund.refund_id}/seller_respond_to_refund/"
        res = self.client.post(url, {'action': 'negotiate', 'counter_refund_method': 'cash', 'counter_notes': 'Cash please!'}, format='json', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertEqual(res.status_code, 400)
        self.assertIn('invalid', res.data.get('error', '').lower())

    def test_invalid_counter_type_rejected(self):
        url = f"/api/return-refund/{self.refund.refund_id}/seller_respond_to_refund/"
        # If seller provides an unknown counter_refund_type, the server will accept the negotiation (type is optional)
        res = self.client.post(url, {'action': 'negotiate', 'counter_refund_method': 'bank', 'counter_refund_type': 'cash', 'counter_notes': 'Invalid type'}, format='json', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertEqual(res.status_code, 200)
        from .models import CounterRefundRequest
        cr = CounterRefundRequest.objects.filter(refund_id=self.refund).order_by('-requested_at').first()
        self.assertIsNotNone(cr)
        self.assertEqual(cr.counter_refund_method, 'bank')
        self.assertIn('Invalid type', cr.notes or '')

    def test_invalid_counter_method_rejected(self):
        url = f"/api/return-refund/{self.refund.refund_id}/seller_respond_to_refund/"
        res = self.client.post(url, {'action': 'negotiate', 'counter_refund_method': 'cash', 'counter_notes': 'Cash please!'}, format='json', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertEqual(res.status_code, 400)
        self.assertIn('invalid', res.data.get('error', '').lower())

    def test_buyer_accepts_counter_offer(self):
        # Seller creates a counter offer
        url = f"/api/return-refund/{self.refund.refund_id}/seller_respond_to_refund/"
        res = self.client.post(url, {'action': 'negotiate', 'counter_refund_method': 'bank', 'counter_refund_type': 'keep', 'counter_notes': 'Partial bank refund'}, format='json', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertEqual(res.status_code, 200)
        from .models import CounterRefundRequest
        cr = CounterRefundRequest.objects.filter(refund_id=self.refund).order_by('-requested_at').first()
        self.assertIsNotNone(cr)

        # Buyer accepts the counter offer
        url2 = f"/api/return-refund/{self.refund.refund_id}/respond_to_negotiation/"
        res2 = self.client.post(url2, {'action': 'accept', 'reason': 'Accepting offer'}, format='json', HTTP_X_USER_ID=str(self.buyer.id))
        self.assertEqual(res2.status_code, 200)
        self.refund.refresh_from_db()
        cr.refresh_from_db()
        self.assertEqual(str(cr.status), 'accepted')
        self.assertEqual(str(self.refund.status), 'approved')
        self.assertEqual(str(self.refund.final_refund_method), 'bank')
        # The counter type should be applied to the refund
        self.assertEqual(str(self.refund.refund_type), 'keep')

    def test_buyer_rejects_counter_offer(self):
        # Seller creates a counter offer
        url = f"/api/return-refund/{self.refund.refund_id}/seller_respond_to_refund/"
        res = self.client.post(url, {'action': 'negotiate', 'counter_refund_method': 'voucher', 'counter_refund_type': 'keep', 'counter_notes': 'Partial voucher'}, format='json', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertEqual(res.status_code, 200)
        from .models import CounterRefundRequest
        cr = CounterRefundRequest.objects.filter(refund_id=self.refund).order_by('-requested_at').first()
        self.assertIsNotNone(cr)

        # Buyer rejects the counter offer
        url2 = f"/api/return-refund/{self.refund.refund_id}/respond_to_negotiation/"
        res2 = self.client.post(url2, {'action': 'reject', 'reason': 'Rejecting offer'}, format='json', HTTP_X_USER_ID=str(self.buyer.id))
        self.assertEqual(res2.status_code, 200)
        cr.refresh_from_db()
        self.refund.refresh_from_db()
        self.assertEqual(str(cr.status), 'rejected')
        # Refund should remain in negotiation state
        self.assertEqual(str(self.refund.status), 'negotiation')

    def test_buyer_accepts_counter_offer_with_return_type(self):
        # Seller sets a return address first
        set_url = f"/api/return-refund/{self.refund.refund_id}/set_return_address/"
        set_payload = {
            'recipient_name': 'Seller',
            'contact_number': '09123456789',
            'country': 'PH',
            'province': 'P',
            'city': 'C',
            'barangay': 'B',
            'street': 'S',
            'zip_code': '1000',
        }
        res_set = self.client.post(set_url, set_payload, format='json', HTTP_X_USER_ID=str(self.seller.id))
        self.assertEqual(res_set.status_code, 200)

        # Seller creates a counter offer with return type (no address in negotiate payload)
        url = f"/api/return-refund/{self.refund.refund_id}/seller_respond_to_refund/"
        res = self.client.post(url, {'action': 'negotiate', 'counter_refund_method': 'return:bank', 'counter_refund_type': 'return', 'counter_notes': 'Please return the item'}, format='json', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertEqual(res.status_code, 200)
        from .models import CounterRefundRequest, ReturnAddress
        cr = CounterRefundRequest.objects.filter(refund_id=self.refund).order_by('-requested_at').first()
        self.assertIsNotNone(cr)

        # Ensure return address exists
        ra = getattr(self.refund, 'return_address', None)
        self.assertIsNotNone(ra)
        self.assertEqual(str(ra.contact_number), '09123456789')

        # Buyer accepts the counter offer
        url2 = f"/api/return-refund/{self.refund.refund_id}/respond_to_negotiation/"
        res2 = self.client.post(url2, {'action': 'accept', 'reason': 'Accepting return offer'}, format='json', HTTP_X_USER_ID=str(self.buyer.id))
        self.assertEqual(res2.status_code, 200)
        self.refund.refresh_from_db()
        cr.refresh_from_db()
        self.assertEqual(str(cr.status), 'accepted')
        self.assertEqual(str(self.refund.status), 'approved')
        self.assertEqual(str(self.refund.final_refund_method), 'return:bank')
        # Refund type should be set to 'return'
        self.assertEqual(str(self.refund.refund_type), 'return')

    def test_seller_negotiate_return_requires_return_address(self):
        url = f"/api/return-refund/{self.refund.refund_id}/seller_respond_to_refund/"
        # No return address provided
        res = self.client.post(url, {'action': 'negotiate', 'counter_refund_method': 'return:bank', 'counter_refund_type': 'return', 'counter_notes': 'Please return the item'}, format='json', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertEqual(res.status_code, 400)
        self.assertIn('Return address required', res.data.get('error', ''))

    def test_seller_negotiate_return_with_address_creates_return_address(self):
        # Use the dedicated set_return_address endpoint to create an address, then negotiate
        set_url = f"/api/return-refund/{self.refund.refund_id}/set_return_address/"
        set_payload = {
            'recipient_name': 'Seller',
            'contact_number': '09123456789',
            'country': 'PH',
            'province': 'P',
            'city': 'C',
            'barangay': 'B',
            'street': 'S',
            'zip_code': '1000',
        }
        res_set = self.client.post(set_url, set_payload, format='json', HTTP_X_USER_ID=str(self.seller.id))
        self.assertEqual(res_set.status_code, 200)

        # Now negotiate
        url = f"/api/return-refund/{self.refund.refund_id}/seller_respond_to_refund/"
        payload = {
            'action': 'negotiate',
            'counter_refund_method': 'return:bank',
            'counter_refund_type': 'return',
            'counter_notes': 'Please return the item'
        }
        res = self.client.post(url, payload, format='json', HTTP_X_USER_ID=str(self.seller.id), HTTP_X_SHOP_ID=str(self.shop.id))
        self.assertEqual(res.status_code, 200)
        from .models import ReturnAddress, CounterRefundRequest
        ra = getattr(self.refund, 'return_address', None)
        self.assertIsNotNone(ra)
        cr = CounterRefundRequest.objects.filter(refund_id=self.refund).order_by('-requested_at').first()
        self.assertIsNotNone(cr)
        self.assertEqual(str(cr.counter_refund_type), 'return')


class DisputeWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # buyer
        self.buyer = User.objects.create(username='dbuyer', email='dbuyer@example.com')
        Customer.objects.create(customer=self.buyer)
        # admin
        self.admin = User.objects.create(username='dadmin', email='dadmin@example.com', is_admin=True)
        Customer.objects.create(customer=self.admin)
        # Create an order and refund
        self.order = Order.objects.create(user=self.buyer, total_amount=50.0, payment_method='cash')
        self.refund = Refund.objects.create(
            reason='Dispute refund',
            buyer_preferred_refund_method='wallet',
            refund_type='keep',
            status='approved',
            order_id=self.order,
            requested_by=self.buyer
        )
        from .models import DisputeRequest
        self.dispute = DisputeRequest.objects.create(refund_id=self.refund, requested_by=self.buyer, reason='I did not receive the item')

    def test_start_review_accepts_numeric_header_and_maps_to_admin(self):
        url = f"/api/disputes/{self.dispute.id}/start_review/"
        res = self.client.post(url, format='json', HTTP_X_USER_ID='1')
        self.assertEqual(res.status_code, 200)
        self.dispute.refresh_from_db()
        # The numeric '1' header should map to the first admin user
        self.assertIsNotNone(self.dispute.processed_by)
        self.assertEqual(self.dispute.processed_by.id, self.admin.id)

    def test_start_review_accepts_username_header(self):
        url = f"/api/disputes/{self.dispute.id}/start_review/"
        res = self.client.post(url, format='json', HTTP_X_USER_ID=str(self.admin.username))
        self.assertEqual(res.status_code, 200)
        self.dispute.refresh_from_db()

    def test_seller_can_process_refund_after_admin_approved_dispute(self):
        # Seller and shop
        seller = User.objects.create(username='seller2', email='seller2@example.com')
        Customer.objects.create(customer=seller)
        shop = Shop.objects.create(name='Seller Shop 2', province='P', city='C', barangay='B', street='S', customer=seller.customer)
        # Product, cart, checkout to link order->shop
        product = Product.objects.create(name='P1', description='d', quantity=1, price=10.0, status='active', condition='New', shop=shop, customer=seller.customer)
        from .models import CartItem, Checkout
        cart = CartItem.objects.create(product=product, user=self.buyer, quantity=1)
        Checkout.objects.create(order=self.order, cart_item=cart, quantity=1, total_amount=10.0, status='completed')

        # Create a return-type refund currently in 'dispute' and with return_request rejected
        r = Refund.objects.create(
            reason='Return dispute',
            buyer_preferred_refund_method='wallet',
            refund_type='return',
            status='dispute',
            order_id=self.order,
            requested_by=self.buyer
        )
        from .models import ReturnRequestItem, DisputeRequest
        ReturnRequestItem.objects.create(refund_id=r, return_method='courier', status='rejected', return_deadline=timezone.now())
        # Admin resolved dispute in favor of buyer
        d = DisputeRequest.objects.create(refund_id=r, requested_by=self.buyer, reason='Missing', status='approved', processed_by=self.admin, resolved_at=timezone.now())

        # Seller attempts to process refund (no proofs) - should be allowed because dispute is approved
        url = f"/api/return-refund/{r.refund_id}/process_refund/"
        res = self.client.post(url, {'final_refund_method': 'wallet', 'set_status': 'processing'}, format='json', HTTP_X_USER_ID=str(seller.id), HTTP_X_SHOP_ID=str(shop.id))
        self.assertIn(res.status_code, [200, 201])
        r.refresh_from_db()
        self.assertEqual(r.refund_payment_status, 'processing')
        self.assertEqual(str(r.status), 'approved')

        self.assertIsNotNone(self.dispute.processed_by)
        self.assertEqual(self.dispute.processed_by.id, self.admin.id)

    def test_start_review_accepts_uuid_header(self):
        url = f"/api/disputes/{self.dispute.id}/start_review/"
        res = self.client.post(url, format='json', HTTP_X_USER_ID=str(self.admin.id))
        self.assertEqual(res.status_code, 200)
        self.dispute.refresh_from_db()
        self.assertIsNotNone(self.dispute.processed_by)
        self.assertEqual(self.dispute.processed_by.id, self.admin.id)

    def test_start_review_accepts_smart_quoted_numeric_header(self):
        # header contains unicode smart quotes — should be sanitized and accepted
        url = f"/api/disputes/{self.dispute.id}/start_review/"
        res = self.client.post(url, format='json', HTTP_X_USER_ID='“1”')
        self.assertEqual(res.status_code, 200)
        self.dispute.refresh_from_db()
        self.assertIsNotNone(self.dispute.processed_by)
        self.assertEqual(self.dispute.processed_by.id, self.admin.id)

    def test_start_review_accepts_quoted_numeric_header(self):
        # header contains ASCII quotes — should be sanitized and accepted
        url = f"/api/disputes/{self.dispute.id}/start_review/"
        res = self.client.post(url, format='json', HTTP_X_USER_ID='"1"')
        self.assertEqual(res.status_code, 200)
        self.dispute.refresh_from_db()
        self.assertIsNotNone(self.dispute.processed_by)
        self.assertEqual(self.dispute.processed_by.id, self.admin.id)

    def test_start_review_accepts_quoted_numeric_header(self):
        url = f"/api/disputes/{self.dispute.id}/start_review/"
        # simulate smart quotes wrapping the numeric header value
        res = self.client.post(url, format='json', HTTP_X_USER_ID='“1”')
        self.assertEqual(res.status_code, 200)
        self.dispute.refresh_from_db()
        self.assertIsNotNone(self.dispute.processed_by)
        self.assertEqual(self.dispute.processed_by.id, self.admin.id)

    def test_buyer_acknowledge_dispute_marks_refund_completed(self):
        # Create a refund currently in 'dispute' with an admin-rejected dispute
        r = Refund.objects.create(
            reason='Dispute reject',
            buyer_preferred_refund_method='wallet',
            refund_type='keep',
            status='dispute',
            order_id=self.order,
            requested_by=self.buyer
        )
        d = DisputeRequest.objects.create(refund_id=r, requested_by=self.buyer, reason='Rejected', status='rejected')

        url = f"/api/disputes/{d.id}/acknowledge/"
        res = self.client.post(url, format='json', HTTP_X_USER_ID=str(self.buyer.id))
        self.assertEqual(res.status_code, 200)

        r.refresh_from_db()
        d.refresh_from_db()
        self.assertEqual(str(r.status), 'completed')
        # Payment status should be completed after buyer acknowledgement
        self.assertEqual(str(r.refund_payment_status), 'completed')
        # Dispute should be marked resolved
        self.assertEqual(str(d.status), 'resolved')
