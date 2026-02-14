// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   ScrollView,
//   Text,
//   StyleSheet,
//   RefreshControl,
//   TouchableOpacity,
//   ActivityIndicator,
// } from 'react-native';
// import { router } from 'expo-router';
// import RoleGuard from '../guards/RoleGuard';
// import AxiosInstance from '../../contexts/axios';
// import { useAuth } from '../../contexts/AuthContext';
// import ModeratorLayout from './ModeratorLayout';

// export default function ModeratorDashboard() {
//   const [dashboardData, setDashboardData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const { userId } = useAuth();

//   const fetchDashboardData = async () => {
//     try {
//       const defaultStartDate = new Date();
//       defaultStartDate.setDate(defaultStartDate.getDate() - 7);
//       const defaultEndDate = new Date();

//       const params = new URLSearchParams();
//       params.append('start_date', defaultStartDate.toISOString().split('T')[0]);
//       params.append('end_date', defaultEndDate.toISOString().split('T')[0]);
//       params.append('range_type', 'weekly');

//       const response = await AxiosInstance.get(
//         `/moderator-dashboard/get_comprehensive_dashboard/?${params.toString()}`,
//         { headers: { 'X-User-Id': userId } }
//       );

//       if (response.data.success) {
//         setDashboardData(response.data);
//       }
//     } catch (error) {
//       console.error('Error fetching dashboard:', error);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   useEffect(() => {
//     fetchDashboardData();
//   }, []);

//   const onRefresh = () => {
//     setRefreshing(true);
//     fetchDashboardData();
//   };

//   return (
//     <RoleGuard allowedRoles={['moderator']}>
//       <ModeratorLayout refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
//         <View style={styles.content}>
//           {loading ? (
//             <View style={styles.centerContainer}>
//               <ActivityIndicator size="large" color="#4F46E5" />
//             </View>
//           ) : (
//             <>
//               {/* Key Metrics */}
//               <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Quick Overview</Text>
//                 <View style={styles.metricsGrid}>
//                   <DashboardCard
//                     label="Active Reports"
//                     value={dashboardData?.active_reports || dashboardData?.operational?.active_reports_count || 0}
//                     color="#ef4444"
//                   />
//                   <DashboardCard
//                     label="Pending Reviews"
//                     value={dashboardData?.pending_approvals || dashboardData?.operational?.pending_approvals_count || 0}
//                     color="#f59e0b"
//                   />
//                   <DashboardCard
//                     label="Users Online"
//                     value={dashboardData?.online_users || dashboardData?.operational?.online_users || 0}
//                     color="#3b82f6"
//                   />
//                   <DashboardCard
//                     label="Today's Issues"
//                     value={dashboardData?.todays_issues || dashboardData?.operational?.todays_issues_count || 0}
//                     color="#8b5cf6"
//                   />
//                 </View>
//               </View>

//               {/* Summary Stats */}
//               <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Platform Summary</Text>
//                 <SummaryStat
//                   label="Total Orders"
//                   value={dashboardData?.overview?.total_orders || 0}
//                 />
//                 <SummaryStat
//                   label="Total Revenue"
//                   value={`₱${(dashboardData?.overview?.total_revenue || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
//                 />
//                 <SummaryStat
//                   label="Active Customers"
//                   value={dashboardData?.overview?.active_customers || 0}
//                 />
//                 <SummaryStat
//                   label="Active Shops"
//                   value={dashboardData?.overview?.active_shops || 0}
//                 />
//               </View>

//               {/* Recent Activity */}
//               <View style={styles.section}>
//                 <Text style={styles.sectionTitle}>Recent Activity</Text>
//                 <View style={styles.activityCard}>
//                   <Text style={styles.activityText}>
//                     {dashboardData?.recent_activity || 'Platform running smoothly'}
//                   </Text>
//                 </View>
//               </View>
//             </>
//           )}
//         </View>
//       </ModeratorLayout>
//     </RoleGuard>
//   );
// }

// function DashboardCard({ label, value, color }: any) {
//   return (
//     <View style={[styles.card, { borderLeftColor: color, borderLeftWidth: 3 }]}>
//       <Text style={styles.cardValue}>{value}</Text>
//       <Text style={styles.cardLabel}>{label}</Text>
//     </View>
//   );
// }

// function SummaryStat({ label, value }: any) {
//   return (
//     <View style={styles.summaryRow}>
//       <Text style={styles.summaryLabel}>{label}</Text>
//       <Text style={styles.summaryValue}>{value}</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   content: {
//     padding: 16,
//   },
//   centerContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     minHeight: 300,
//   },
//   section: {
//     marginBottom: 24,
//   },
//   sectionTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#111827',
//     marginBottom: 12,
//   },
//   metricsGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//     gap: 12,
//   },
//   card: {
//     flex: 1,
//     minWidth: '48%',
//     backgroundColor: '#FFFFFF',
//     padding: 16,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#F3F4F6',
//   },
//   cardValue: {
//     fontSize: 24,
//     fontWeight: '700',
//     color: '#111827',
//     marginBottom: 4,
//   },
//   cardLabel: {
//     fontSize: 12,
//     color: '#6B7280',
//   },
//   summaryRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: '#FFFFFF',
//     paddingVertical: 12,
//     paddingHorizontal: 14,
//     marginBottom: 8,
//     borderRadius: 6,
//     borderWidth: 1,
//     borderColor: '#F3F4F6',
//   },
//   summaryLabel: {
//     fontSize: 14,
//     color: '#6B7280',
//     flex: 1,
//   },
//   summaryValue: {
//     fontSize: 15,
//     fontWeight: '700',
//     color: '#111827',
//   },
//   activityCard: {
//     backgroundColor: '#FFFFFF',
//     padding: 14,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#F3F4F6',
//   },
//   activityText: {
//     fontSize: 13,
//     color: '#6B7280',
//     lineHeight: 20,
//   },
// });
