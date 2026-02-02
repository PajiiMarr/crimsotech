import React from 'react';
import { Stack } from 'expo-router';
import CreateProductFormMobile from '../customer/create/add-selling-product-form';

export default function SellerCreateProducts() {
	return (
		<>
			<Stack.Screen options={{
				title: 'Add Product',
				headerTitleAlign: 'center',
				headerShadowVisible: false,
				headerStyle: { backgroundColor: '#fff' }
			}} />
			<CreateProductFormMobile />
		</>
	);
}
