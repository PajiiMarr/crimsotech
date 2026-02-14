// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   RefreshControl,
//   TouchableOpacity,
//   ActivityIndicator,
//   FlatList,
// } from 'react-native';
// import { router } from 'expo-router';
// import RoleGuard from '../guards/RoleGuard';
// import AxiosInstance from '../../contexts/axios';
// import { useAuth } from '../../contexts/AuthContext';
// import ModeratorLayout from './ModeratorLayout';

// export default function ModeratorOrders() {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [filters, setFilters] = useState('all');
//   const { userId } = useAuth();

//   const fetchOrders = async () => {
//     try {
//       const response = await AxiosInstance.get('/moderator-orders/', {
//         headers: { 'X-User-Id': userId },
//       });
//       setOrders(response.data.results || []);
//     } catch (error) {
//       console.error('Error fetching orders:', error);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   useEffect(() => {
//     fetchOrders();
//   }, []);

//   const onRefresh = () => {
//     setRefreshing(true);
//     fetchOrders();
//   };

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'completed':
//         return '#10b981';
//       case 'pending':
//         return '#f59e0b';
//       case 'canceled':
//         return '#ef4444';
//       case 'in_transit':
//         return '#3b82f6';
//       default:
//         return '#64748b';
//     }
//   };

//   return (
//     <RoleGuard allowedRoles={['moderator']}>
//       <ModeratorLayout refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
//         {/* Filters */}
//         <View style={styles.filtersContainer}>
//           {['all', 'pending', 'completed', 'canceled'].map((status) => (
//             <TouchableOpacity
//               key={status}
//               style={[
//                 styles.filterBtn,
//                 filters === status && styles.filterBtnActive,
//               ]}
//               onPress={() => setFilters(status)}
//             >
//               <Text
//                 style={[
//                   styles.filterText,
//                   filters === status && styles.filterTextActive,
//                 ]}
//               >
//                 {status.replace('_', ' ')}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>

//         {loading ? (
//           <View style={styles.centerContainer}>
//             <ActivityIndicator size="large" color="#9ca3af" />
//           </View>
//         ) : (
//           <View style={styles.content}>
//             {orders.length === 0 ? (
//               <View style={styles.emptyState}>
//                 <Text style={styles.emptyText}>No orders found</Text>
//               </View>
//             ) : (
//               <FlatList
//                 scrollEnabled={false}
//                 data={orders}
//                 keyExtractor={(item) => item.id}
//                 renderItem={({ item }) => (
//                   <TouchableOpacity
//                     onPress={() => router.push(`/moderator/orders/${item.id}`)}
//                     style={styles.orderCard}
//                   >
//                     <View style={styles.orderHeader}>
//                       <View style={styles.orderInfo}>
//                         <Text style={styles.orderId}>Order #{item.id}</Text>
//                         <Text style={styles.customer}>{item.customer}</Text>
//                       </View>
//                       <View
//                         style={[
//                           styles.statusBadge,
//                           { backgroundColor: getStatusColor(item.status) },
//                         ]}
//                       >
//                         <Text style={styles.statusText}>{item.status}</Text>
//                       </View>
//                     </View>
//                     <View style={styles.orderMeta}>
//                       <Text style={styles.metaText}>
//                         Amount: ₱{item.amount}
//                       </Text>
//                       <Text style={styles.metaText}>Items: {item.items}</Text>
//                       <Text style={styles.metaText}>
//                         {new Date(item.created_at).toLocaleDateString()}
//                       </Text>
//                     </View>
//                   </TouchableOpacity>
//                 )}
//               />
//             )}
//           </View>
//         )}
//       </ModeratorLayout>
//     </RoleGuard>
//   );
// }

// const styles = StyleSheet.create({
//   filtersContainer: {
//     flexDirection: 'row',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     gap: 8,
//     backgroundColor: '#FFFFFF',
//     borderBottomWidth: 1,
//     borderBottomColor: '#F3F4F6',
//   },
//   filterBtn: {
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     borderRadius: 6,
//     backgroundColor: '#F3F4F6',
//   },
//   filterBtnActive: {
//     backgroundColor: '#4F46E5',
//   },
//   filterText: {
//     fontSize: 11,
//     color: '#6B7280',
//     fontWeight: '500',
//     textTransform: 'capitalize',
//   },
//   filterTextActive: {
//     color: '#FFFFFF',
//   },
//   centerContainer: {
//     justifyContent: 'center',
//     alignItems: 'center',
//     minHeight: 300,
//   },
//   content: {
//     padding: 16,
//   },
//   emptyState: {
//     justifyContent: 'center',
//     alignItems: 'center',
//     minHeight: 200,
//   },
//   emptyText: {
//     color: '#9CA3AF',
//     fontSize: 14,
//   },
//   orderCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 8,
//     padding: 14,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: '#F3F4F6',
//   },
//   orderHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     marginBottom: 10,
//   },
//   orderInfo: {
//     flex: 1,
//   },
//   orderId: {
//     fontSize: 14,
//     fontWeight: '700',
//     color: '#111827',
//     marginBottom: 4,
//   },
//   customer: {
//     fontSize: 12,
//     color: '#9CA3AF',
//   },
//   statusBadge: {
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 4,
//   },
//   statusText: {
//     fontSize: 11,
//     fontWeight: '600',
//     color: '#fff',
//     textTransform: 'capitalize',
//   },
//   orderMeta: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 12,
//   },
//   metaText: {
//     fontSize: 11,
//     color: '#6B7280',
//   },
// });
