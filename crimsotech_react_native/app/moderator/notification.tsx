// import React, { useState, useEffect } from 'react';
// import {
//   SafeAreaView,
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   FlatList,
//   ActivityIndicator,
// } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { router } from 'expo-router';
// import RoleGuard from '../guards/RoleGuard';

// interface Notification {
//   id: string;
//   title: string;
//   description: string;
//   timestamp: string;
//   icon: string;
//   isRead: boolean;
//   type: 'alert' | 'info' | 'warning' | 'success';
// }

// export default function ModeratorNotification() {
//   const [notifications, setNotifications] = useState<Notification[]>([
//     {
//       id: '1',
//       title: 'New Report',
//       description: 'Product flagged for review by user',
//       timestamp: '2 hours ago',
//       icon: 'flag',
//       isRead: false,
//       type: 'alert',
//     },
//     {
//       id: '2',
//       title: 'Order Completed',
//       description: 'Order #12345 has been marked as completed',
//       timestamp: '5 hours ago',
//       icon: 'checkmark-done',
//       isRead: false,
//       type: 'success',
//     },
//     {
//       id: '3',
//       title: 'New Shop Application',
//       description: 'New seller shop awaiting verification',
//       timestamp: '1 day ago',
//       icon: 'checkmark-circle',
//       isRead: true,
//       type: 'info',
//     },
//   ]);

//   const getTypeColor = (type: string) => {
//     switch (type) {
//       case 'alert':
//         return '#EF4444';
//       case 'warning':
//         return '#F59E0B';
//       case 'success':
//         return '#10B981';
//       default:
//         return '#3B82F6';
//     }
//   };

//   const renderNotification = ({ item }: { item: Notification }) => (
//     <TouchableOpacity
//       style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
//       activeOpacity={0.7}
//     >
//       <View
//         style={[
//           styles.iconContainer,
//           { backgroundColor: `${getTypeColor(item.type)}20` },
//         ]}
//       >
//         <Ionicons
//           name={item.icon as any}
//           size={20}
//           color={getTypeColor(item.type)}
//         />
//       </View>

//       <View style={styles.content}>
//         <Text style={styles.title}>{item.title}</Text>
//         <Text style={styles.description}>{item.description}</Text>
//         <Text style={styles.timestamp}>{item.timestamp}</Text>
//       </View>

//       {!item.isRead && <View style={styles.unreadIndicator} />}
//     </TouchableOpacity>
//   );

//   return (
//     <RoleGuard allowedRoles={['moderator']}>
//       <SafeAreaView style={styles.container}>
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
//             <Ionicons name="arrow-back" size={26} color="#000000" />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>Notifications</Text>
//           <View style={{ width: 26 }} />
//         </View>

//         <FlatList
//           data={notifications}
//           renderItem={renderNotification}
//           keyExtractor={(item) => item.id}
//           style={styles.list}
//           ListEmptyComponent={
//             <View style={styles.emptyContainer}>
//               <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
//               <Text style={styles.emptyText}>No notifications yet</Text>
//             </View>
//           }
//           scrollEnabled={true}
//         />
//       </SafeAreaView>
//     </RoleGuard>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F8F9FA',
//   },
//   header: {
//     height: 56,
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#FFFFFF',
//     paddingHorizontal: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E7EB',
//     justifyContent: 'space-between',
//   },
//   backButton: {
//     padding: 8,
//   },
//   headerTitle: {
//     fontSize: 18,
//     fontWeight: '600',
//     color: '#111827',
//     flex: 1,
//     textAlign: 'center',
//   },
//   list: {
//     flex: 1,
//     padding: 12,
//   },
//   notificationCard: {
//     flexDirection: 'row',
//     backgroundColor: '#FFFFFF',
//     borderRadius: 8,
//     padding: 12,
//     marginBottom: 8,
//     borderWidth: 1,
//     borderColor: '#F3F4F6',
//     alignItems: 'flex-start',
//   },
//   unreadCard: {
//     backgroundColor: '#F8FAFC',
//     borderLeftWidth: 3,
//     borderLeftColor: '#4F46E5',
//   },
//   iconContainer: {
//     width: 40,
//     height: 40,
//     borderRadius: 8,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 12,
//   },
//   content: {
//     flex: 1,
//   },
//   title: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#111827',
//     marginBottom: 2,
//   },
//   description: {
//     fontSize: 12,
//     color: '#6B7280',
//     marginBottom: 4,
//   },
//   timestamp: {
//     fontSize: 11,
//     color: '#9CA3AF',
//   },
//   unreadIndicator: {
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//     backgroundColor: '#4F46E5',
//     marginLeft: 8,
//     marginTop: 2,
//   },
//   emptyContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     paddingVertical: 48,
//   },
//   emptyText: {
//     fontSize: 14,
//     color: '#9CA3AF',
//     marginTop: 12,
//   },
// });
