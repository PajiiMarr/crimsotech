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

// export default function ModeratorBoosting() {
//   const [boosts, setBoosts] = useState([]);
//   const [plans, setPlans] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [activeTab, setActiveTab] = useState('boosts');
//   const { userId } = useAuth();

//   const fetchData = async () => {
//     try {
//       const [boostsRes, plansRes] = await Promise.all([
//         AxiosInstance.get('/moderator-boosts/', {
//           headers: { 'X-User-Id': userId },
//         }),
//         AxiosInstance.get('/moderator-boost-plans/', {
//           headers: { 'X-User-Id': userId },
//         }),
//       ]);

//       setBoosts(boostsRes.data.results || []);
//       setPlans(plansRes.data.results || []);
//     } catch (error) {
//       console.error('Error fetching data:', error);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   useEffect(() => {
//     fetchData();
//   }, []);

//   const onRefresh = () => {
//     setRefreshing(true);
//     fetchData();
//   };

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'active':
//         return '#10b981';
//       case 'expired':
//         return '#6b7280';
//       case 'pending':
//         return '#f59e0b';
//       default:
//         return '#64748b';
//     }
//   };

//   return (
//     <RoleGuard allowedRoles={['moderator']}>
//       <ModeratorLayout refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
//         {/* Tabs */}
//         <View style={styles.tabsContainer}>
//           <TouchableOpacity
//             style={[
//               styles.tab,
//               activeTab === 'boosts' && styles.tabActive,
//             ]}
//             onPress={() => setActiveTab('boosts')}
//           >
//             <Text
//               style={[
//                 styles.tabText,
//                 activeTab === 'boosts' && styles.tabTextActive,
//               ]}
//             >
//               Active Boosts
//             </Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={[
//               styles.tab,
//               activeTab === 'plans' && styles.tabActive,
//             ]}
//             onPress={() => setActiveTab('plans')}
//           >
//             <Text
//               style={[
//                 styles.tabText,
//                 activeTab === 'plans' && styles.tabTextActive,
//               ]}
//             >
//               Boost Plans
//             </Text>
//           </TouchableOpacity>
//         </View>

//         {loading ? (
//           <View style={styles.centerContainer}>
//             <ActivityIndicator size="large" color="#9ca3af" />
//           </View>
//         ) : (
//           <View style={styles.content}>
//             {activeTab === 'boosts' ? (
//               boosts.length === 0 ? (
//                 <View style={styles.emptyState}>
//                   <Text style={styles.emptyText}>No active boosts</Text>
//                 </View>
//               ) : (
//                 <FlatList
//                   scrollEnabled={false}
//                   data={boosts}
//                   keyExtractor={(item) => item.id}
//                   renderItem={({ item }) => (
//                     <TouchableOpacity
//                       onPress={() =>
//                         router.push(`/moderator/boosting/${item.id}`)
//                       }
//                       style={styles.boostCard}
//                     >
//                       <View style={styles.boostHeader}>
//                         <View style={styles.boostInfo}>
//                           <Text style={styles.boostTitle}>
//                             {item.product_name || item.shop_name}
//                           </Text>
//                           <Text style={styles.boostOwner}>{item.owner}</Text>
//                         </View>
//                         <View
//                           style={[
//                             styles.statusBadge,
//                             {
//                               backgroundColor: getStatusColor(
//                                 item.status
//                               ),
//                             },
//                           ]}
//                         >
//                           <Text style={styles.statusText}>
//                             {item.status}
//                           </Text>
//                         </View>
//                       </View>
//                       <View style={styles.boostMeta}>
//                         <Text style={styles.metaText}>
//                           Plan: {item.plan}
//                         </Text>
//                         <Text style={styles.metaText}>
//                           Cost: ₱{item.cost}
//                         </Text>
//                         <Text style={styles.metaText}>
//                           Clicks: {item.clicks || 0}
//                         </Text>
//                       </View>
//                     </TouchableOpacity>
//                   )}
//                 />
//               )
//             ) : plans.length === 0 ? (
//               <View style={styles.emptyState}>
//                 <Text style={styles.emptyText}>No boost plans</Text>
//               </View>
//             ) : (
//               <FlatList
//                 scrollEnabled={false}
//                 data={plans}
//                 keyExtractor={(item) => item.id}
//                 renderItem={({ item }) => (
//                   <TouchableOpacity
//                     onPress={() => router.push(`/moderator/boosting/plan/${item.id}`)}
//                     style={styles.planCard}
//                   >
//                     <View style={styles.planHeader}>
//                       <View style={styles.planInfo}>
//                         <Text style={styles.planName}>{item.name}</Text>
//                         <Text style={styles.planPrice}>₱{item.price}</Text>
//                       </View>
//                       <View
//                         style={[
//                           styles.planStatusBadge,
//                           {
//                             backgroundColor: item.status === 'active'
//                               ? '#10b981'
//                               : '#6b7280',
//                           },
//                         ]}
//                       >
//                         <Text style={styles.statusText}>
//                           {item.status}
//                         </Text>
//                       </View>
//                     </View>
//                     <View style={styles.planMeta}>
//                       <Text style={styles.metaText}>
//                         Duration: {item.duration} {item.timeUnit}
//                       </Text>
//                       <Text style={styles.metaText}>
//                         Usage: {item.usageCount || 0}
//                       </Text>
//                       <Text style={styles.metaText}>
//                         Revenue: ₱{item.revenue || 0}
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
//   tabsContainer: {
//     flexDirection: 'row',
//     backgroundColor: '#FFFFFF',
//     borderBottomWidth: 1,
//     borderBottomColor: '#F3F4F6',
//   },
//   tab: {
//     flex: 1,
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     alignItems: 'center',
//     borderBottomWidth: 2,
//     borderBottomColor: 'transparent',
//   },
//   tabActive: {
//     borderBottomColor: '#4F46E5',
//   },
//   tabText: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: '#9CA3AF',
//   },
//   tabTextActive: {
//     color: '#4F46E5',
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
//   boostCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 8,
//     padding: 14,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: '#F3F4F6',
//   },
//   boostHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     marginBottom: 10,
//   },
//   boostInfo: {
//     flex: 1,
//   },
//   boostTitle: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#111827',
//     marginBottom: 4,
//   },
//   boostOwner: {
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
//   boostMeta: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 12,
//   },
//   metaText: {
//     fontSize: 11,
//     color: '#6B7280',
//   },
//   planCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 8,
//     padding: 14,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: '#F3F4F6',
//   },
//   planHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     marginBottom: 10,
//   },
//   planInfo: {
//     flex: 1,
//   },
//   planName: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#111827',
//     marginBottom: 4,
//   },
//   planPrice: {
//     fontSize: 15,
//     fontWeight: '700',
//     color: '#10b981',
//   },
//   planStatusBadge: {
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 4,
//   },
//   planMeta: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 12,
//   },
// });
