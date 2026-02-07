import React, { useMemo, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	SafeAreaView,
	ScrollView,
	TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import {
	Bell,
	Package,
	ShoppingCart,
	Tag,
	Wallet,
	Truck,
	AlertTriangle,
} from 'lucide-react-native';

type SellerNotification = {
	id: string;
	title: string;
	message: string;
	time: string;
	type:
		| 'order'
		| 'product'
		| 'voucher'
		| 'payout'
		| 'delivery'
		| 'alert';
	isRead: boolean;
};

const typeMeta = {
	order: { icon: ShoppingCart, bg: '#FEF3C7', accent: '#B45309' },
	product: { icon: Package, bg: '#E0F2FE', accent: '#0284C7' },
	voucher: { icon: Tag, bg: '#FCE7F3', accent: '#BE185D' },
	payout: { icon: Wallet, bg: '#DCFCE7', accent: '#16A34A' },
	delivery: { icon: Truck, bg: '#EDE9FE', accent: '#7C3AED' },
	alert: { icon: AlertTriangle, bg: '#FFE4E6', accent: '#E11D48' },
} as const;

const seedNotifications: SellerNotification[] = [
	{
		id: 'n1',
		title: 'New order received',
		message: 'Order #A1047 contains 3 items. Pack within 24 hours.',
		time: '2 mins ago',
		type: 'order',
		isRead: false,
	},
	{
		id: 'n2',
		title: 'Stock alert',
		message: '"Eco Powerbank" is below the critical threshold (2 left).',
		time: '1 hour ago',
		type: 'alert',
		isRead: false,
	},
	{
		id: 'n3',
		title: 'Product approved',
		message: '"Wireless Earbuds Pro" is now live in your store.',
		time: 'Yesterday',
		type: 'product',
		isRead: true,
	},
	{
		id: 'n4',
		title: 'Voucher redeemed',
		message: 'A buyer used your "WELCOME10" voucher.',
		time: '2 days ago',
		type: 'voucher',
		isRead: true,
	},
	{
		id: 'n5',
		title: 'Payout scheduled',
		message: 'Your payout of ₱4,250 is scheduled for Feb 10.',
		time: 'Feb 7',
		type: 'payout',
		isRead: true,
	},
];

export default function SellerNotificationScreen() {
	const [notifications, setNotifications] = useState(seedNotifications);

	const unreadCount = useMemo(
		() => notifications.filter((item) => !item.isRead).length,
		[notifications]
	);

	const markAllRead = () => {
		setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
	};

	const toggleRead = (id: string) => {
		setNotifications((prev) =>
			prev.map((item) =>
				item.id === id ? { ...item, isRead: !item.isRead } : item
			)
		);
	};

	return (
		<SafeAreaView style={styles.container}>
			<Stack.Screen
				options={{
					title: 'Notifications',
					headerTitleAlign: 'center',
					headerShadowVisible: false,
				}}
			/>

			<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
				<View style={styles.headerCard}>
					<View style={styles.headerLeft}>
						<View style={styles.headerIconCircle}>
							<Bell size={18} color="#0F172A" />
						</View>
						<View>
							<Text style={styles.headerTitle}>Seller Alerts</Text>
							<Text style={styles.headerSubtitle}>
								{unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
							</Text>
						</View>
					</View>
					<TouchableOpacity
						style={[styles.markAllButton, unreadCount === 0 && styles.markAllButtonDisabled]}
						onPress={markAllRead}
						disabled={unreadCount === 0}
					>
						<Text style={styles.markAllText}>Mark all read</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.listCard}>
					{notifications.map((item) => {
						const meta = typeMeta[item.type];
						const Icon = meta.icon;
						return (
							<TouchableOpacity
								key={item.id}
								style={[styles.notificationRow, !item.isRead && styles.unreadRow]}
								onPress={() => toggleRead(item.id)}
								activeOpacity={0.8}
							>
								<View style={[styles.iconCircle, { backgroundColor: meta.bg }]}
								>
									<Icon size={18} color={meta.accent} />
								</View>
								<View style={styles.textBlock}>
									<View style={styles.rowTop}>
										<Text style={styles.titleText}>{item.title}</Text>
										{!item.isRead && <View style={styles.dot} />}
									</View>
									<Text style={styles.messageText}>{item.message}</Text>
									<Text style={styles.timeText}>{item.time}</Text>
								</View>
							</TouchableOpacity>
						);
					})}
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	scrollContent: {
		paddingBottom: 24,
	},
	headerCard: {
		marginHorizontal: 16,
		marginTop: 16,
		backgroundColor: '#FFFFFF',
		borderRadius: 20,
		padding: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 10,
		elevation: 3,
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	headerIconCircle: {
		width: 40,
		height: 40,
		borderRadius: 12,
		backgroundColor: '#E2E8F0',
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#0F172A',
	},
	headerSubtitle: {
		fontSize: 12,
		color: '#64748B',
		marginTop: 2,
	},
	markAllButton: {
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 12,
		backgroundColor: '#EEF2FF',
	},
	markAllButtonDisabled: {
		opacity: 0.5,
	},
	markAllText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#4F46E5',
	},
	listCard: {
		marginHorizontal: 16,
		marginTop: 16,
		backgroundColor: '#FFFFFF',
		borderRadius: 20,
		paddingVertical: 8,
		paddingHorizontal: 12,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 12,
		elevation: 3,
	},
	notificationRow: {
		flexDirection: 'row',
		gap: 12,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: '#F1F5F9',
	},
	unreadRow: {
		backgroundColor: '#F8FAFF',
		borderRadius: 12,
		paddingHorizontal: 8,
	},
	iconCircle: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	textBlock: {
		flex: 1,
	},
	rowTop: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	titleText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#0F172A',
		flex: 1,
		paddingRight: 8,
	},
	messageText: {
		fontSize: 12,
		color: '#475569',
		marginTop: 4,
	},
	timeText: {
		fontSize: 11,
		color: '#94A3B8',
		marginTop: 6,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#2563EB',
	},
});
