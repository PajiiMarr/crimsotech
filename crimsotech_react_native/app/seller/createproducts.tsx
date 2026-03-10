import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import CreateProductFormMobile from '../customer/create/add-selling-product-form';

export default function SellerCreateProducts() {
	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen options={{
				title: 'Add Product',
				headerTitleAlign: 'center',
				headerShadowVisible: false,
				headerStyle: { backgroundColor: '#fff' }
			}} />
			<CreateProductFormMobile />
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
});
