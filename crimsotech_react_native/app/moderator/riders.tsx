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

// export default function ModeratorRiders() {
//   const [riders, setRiders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const { userId } = useAuth();

//   const fetchRiders = async () => {
//     try {
//       const response = await AxiosInstance.get('/moderator-riders/', {
//         headers: { 'X-User-Id': userId },
//       });
//       setRiders(response.data.results || []);
//     } catch (error) {
//       console.error('Error fetching riders:', error);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   useEffect(() => {
//     fetchRiders();
//   }, []);

//   const onRefresh = () => {
//     setRefreshing(true);
//     fetchRiders();
//   };

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'available':
//         return '#10b981';
//       case 'busy':
//         return '#f59e0b';
//       case 'offline':
//         return '#6b7280';
//       default:
//         return '#64748b';
//     }
//   };

//   return (
//     <RoleGuard allowedRoles={['moderator']}>
//       <ModeratorLayout refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
//         {loading ? (
//           <View style={styles.centerContainer}>
//             <ActivityIndicator size="large" color="#9ca3af" />
//           </View>
//         ) : (
//           <View style={styles.content}>
//             {riders.length === 0 ? (
//               <View style={styles.emptyState}>
//                 <Text style={styles.emptyText}>No riders found</Text>
//               </View>
//             ) : (
//               <FlatList
//                 scrollEnabled={false}
//                 data={riders}
//                 keyExtractor={(item) => item.id}
//                 renderItem={({ item }) => (
//                   <TouchableOpacity
//                     onPress={() => router.push(`/moderator/riders/${item.id}`)}
//                     style={styles.riderCard}
//                   >
//                     <View style={styles.riderHeader}>
//                       <View style={styles.riderInfo}>
//                         <Text style={styles.riderName}>{item.name}</Text>
//                         <Text style={styles.riderPhone}>{item.phone}</Text>
//                       </View>
//                       <View
//                         style={[
//                           styles.statusBadge,
//                           { backgroundColor: getStatusColor(item.status) },
//                         ]}
//                       >
//                         <Text style={styles.statusText}>
//                           {item.status}
//                         </Text>
//                       </View>
//                     </View>
//                     <View style={styles.riderMeta}>
//                       <Text style={styles.metaText}>
//                         Vehicle: {item.vehicle_type}
//                       </Text>
//                       <Text style={styles.metaText}>
//                         Deliveries: {item.deliveries}
//                       </Text>
//                       <Text style={styles.metaText}>
//                         Rating: {item.rating || 'N/A'}/5
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
//   riderCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 8,
//     padding: 14,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: '#F3F4F6',
//   },
//   riderHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     marginBottom: 10,
//   },
//   riderInfo: {
//     flex: 1,
//   },
//   riderName: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#111827',
//     marginBottom: 4,
//   },
//   riderPhone: {
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
//   riderMeta: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 12,
//   },
//   metaText: {
//     fontSize: 11,
//     color: '#6B7280',
//   },
// });
