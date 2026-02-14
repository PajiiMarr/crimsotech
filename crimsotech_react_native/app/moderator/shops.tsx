// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   ScrollView,
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

// export default function ModeratorShops() {
//   const [shops, setShops] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const { userId } = useAuth();

//   const fetchShops = async () => {
//     try {
//       const response = await AxiosInstance.get('/moderator-shops/', {
//         headers: { 'X-User-Id': userId },
//       });
//       setShops(response.data.results || []);
//     } catch (error) {
//       console.error('Error fetching shops:', error);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   useEffect(() => {
//     fetchShops();
//   }, []);

//   const onRefresh = () => {
//     setRefreshing(true);
//     fetchShops();
//   };

//   return (
//     <RoleGuard allowedRoles={['moderator']}>
//       <ModeratorLayout refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
//         <View style={styles.content}>
//             {shops.length === 0 ? (
//               <View style={styles.emptyState}>
//                 <Text style={styles.emptyText}>No shops found</Text>
//               </View>
//             ) : (
//               <FlatList
//                 scrollEnabled={false}
//                 data={shops}
//                 keyExtractor={(item) => item.id}
//                 renderItem={({ item }) => (
//                   <TouchableOpacity
//                     onPress={() => router.push(`/moderator/shops/${item.id}`)}
//                     style={styles.shopCard}
//                   >
//                     <View style={styles.shopHeader}>
//                       <View style={styles.shopInfo}>
//                         <Text style={styles.shopName} numberOfLines={2}>
//                           {item.name}
//                         </Text>
//                         <Text style={styles.shopOwner}>{item.owner}</Text>
//                       </View>
//                       <View
//                         style={[
//                           styles.verifiedBadge,
//                           {
//                             backgroundColor: item.verified
//                               ? '#10b981'
//                               : '#ef4444',
//                           },
//                         ]}
//                       >
//                         <Text style={styles.verifiedText}>
//                           {item.verified ? '✓' : '!'}
//                         </Text>
//                       </View>
//                     </View>
//                     <View style={styles.shopMeta}>
//                       <Text style={styles.metaText}>
//                         Location: {item.city}
//                       </Text>
//                       <Text style={styles.metaText}>
//                         Sales: ₱{item.total_sales}
//                       </Text>
//                       <Text style={styles.metaText}>
//                         Reports: {item.reports || 0}
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
//   container: {
//     flex: 1,
//     backgroundColor: '#F8F9FA',
//   },
//   header: {
//     padding: 20,
//     backgroundColor: '#FFFFFF',
//     borderBottomWidth: 1,
//     borderBottomColor: '#F3F4F6',
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: '700',
//     color: '#111827',
//     marginBottom: 4,
//   },
//   subtitle: {
//     fontSize: 14,
//     color: '#6B7280',
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
//   shopCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 8,
//     padding: 14,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: '#F3F4F6',
//   },
//   shopHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     marginBottom: 10,
//   },
//   shopInfo: {
//     flex: 1,
//     marginRight: 10,
//   },
//   shopName: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#111827',
//     marginBottom: 4,
//   },
//   shopOwner: {
//     fontSize: 12,
//     color: '#9CA3AF',
//   },
//   verifiedBadge: {
//     width: 32,
//     height: 32,
//     borderRadius: 16,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   verifiedText: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#fff',
//   },
//   shopMeta: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 12,
//   },
//   metaText: {
//     fontSize: 11,
//     color: '#6B7280',
//   },
// });
