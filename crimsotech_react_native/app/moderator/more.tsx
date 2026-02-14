// import React from 'react';
// import {
//   SafeAreaView,
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   Platform,
// } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { router } from 'expo-router';
// import RoleGuard from '../guards/RoleGuard';
// import ModeratorLayout from './ModeratorLayout';

// interface MenuOption {
//   icon: string;
//   label: string;
//   route: string;
//   badge?: number;
// }

// export default function ModeratorMore() {
//   const menuOptions: MenuOption[] = [
//     { icon: 'people-outline', label: 'Shops', route: '/moderator/shops' },
//     { icon: 'person-outline', label: 'Riders', route: '/moderator/riders' },
//     { icon: 'receipt-outline', label: 'Vouchers', route: '/moderator/vouchers' },
//     { icon: 'flash-outline', label: 'Boosting', route: '/moderator/boosting' },
//   ];

//   const MenuItem = ({ icon, label, route, badge }: MenuOption) => (
//     <TouchableOpacity
//       style={styles.menuItem}
//       onPress={() => router.push(route as any)}
//       activeOpacity={0.7}
//     >
//       <View style={styles.menuItemContent}>
//         <View style={styles.iconContainer}>
//           <Ionicons name={icon as any} size={24} color="#4F46E5" />
//         </View>
//         <View style={styles.labelContainer}>
//           <Text style={styles.label}>{label}</Text>
//           <Text style={styles.sublabel}>Manage and monitor</Text>
//         </View>
//       </View>
//       <View style={styles.rightContent}>
//         {badge && badge > 0 && (
//           <View style={styles.badge}>
//             <Text style={styles.badgeText}>{badge}</Text>
//           </View>
//         )}
//         <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
//       </View>
//     </TouchableOpacity>
//   );

//   return (
//     <RoleGuard allowedRoles={['moderator']}>
//       <ModeratorLayout>
//         <View style={styles.container}>
//           <View style={styles.header}>
//             <Text style={styles.title}>More Options</Text>
//             <Text style={styles.subtitle}>Access additional management tools</Text>
//           </View>

//           <View style={styles.grid}>
//             {menuOptions.map((option, index) => (
//               <MenuItem
//                 key={index}
//                 icon={option.icon}
//                 label={option.label}
//                 route={option.route}
//                 badge={option.badge}
//               />
//             ))}
//           </View>

//           {/* Quick Stats */}
//           <View style={styles.statsSection}>
//             <Text style={styles.statsTitle}>Quick Summary</Text>
//             <View style={styles.statGrid}>
//               <View style={styles.statCard}>
//                 <Ionicons name="storefront-outline" size={24} color="#4F46E5" />
//                 <Text style={styles.statValue}>245</Text>
//                 <Text style={styles.statLabel}>Shops</Text>
//               </View>
//               <View style={styles.statCard}>
//                 <Ionicons name="bicycle-outline" size={24} color="#4F46E5" />
//                 <Text style={styles.statValue}>185</Text>
//                 <Text style={styles.statLabel}>Riders</Text>
//               </View>
//               <View style={styles.statCard}>
//                 <Ionicons name="ticket-outline" size={24} color="#4F46E5" />
//                 <Text style={styles.statValue}>42</Text>
//                 <Text style={styles.statLabel}>Active Codes</Text>
//               </View>
//               <View style={styles.statCard}>
//                 <Ionicons name="flash-outline" size={24} color="#4F46E5" />
//                 <Text style={styles.statValue}>12</Text>
//                 <Text style={styles.statLabel}>Active Boosts</Text>
//               </View>
//             </View>
//           </View>
//         </View>
//       </ModeratorLayout>
//     </RoleGuard>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F8F9FA',
//     paddingHorizontal: 16,
//     paddingTop: 16,
//   },
//   header: {
//     marginBottom: 24,
//   },
//   title: {
//     fontSize: 26,
//     fontWeight: '700',
//     color: '#111827',
//     marginBottom: 4,
//   },
//   subtitle: {
//     fontSize: 14,
//     color: '#6B7280',
//   },
//   grid: {
//     marginBottom: 32,
//     gap: 12,
//   },
//   menuItem: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     backgroundColor: '#FFFFFF',
//     borderRadius: 8,
//     padding: 14,
//     borderWidth: 1,
//     borderColor: '#F3F4F6',
//   },
//   menuItemContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     flex: 1,
//   },
//   iconContainer: {
//     width: 40,
//     height: 40,
//     borderRadius: 8,
//     backgroundColor: '#EEF2FF',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginRight: 12,
//   },
//   labelContainer: {
//     flex: 1,
//   },
//   label: {
//     fontSize: 15,
//     fontWeight: '600',
//     color: '#111827',
//     marginBottom: 2,
//   },
//   sublabel: {
//     fontSize: 12,
//     color: '#9CA3AF',
//   },
//   rightContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   badge: {
//     backgroundColor: '#EF4444',
//     borderRadius: 12,
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//   },
//   badgeText: {
//     fontSize: 12,
//     fontWeight: '600',
//     color: '#FFF',
//   },
//   statsSection: {
//     marginTop: 24,
//     marginBottom: 32,
//   },
//   statsTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#111827',
//     marginBottom: 12,
//   },
//   statGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 12,
//   },
//   statCard: {
//     flex: 1,
//     minWidth: '45%',
//     backgroundColor: '#FFFFFF',
//     borderRadius: 8,
//     padding: 12,
//     borderWidth: 1,
//     borderColor: '#F3F4F6',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   statValue: {
//     fontSize: 18,
//     fontWeight: '700',
//     color: '#111827',
//     marginTop: 8,
//   },
//   statLabel: {
//     fontSize: 12,
//     color: '#6B7280',
//     marginTop: 2,
//     textAlign: 'center',
//   },
// });
