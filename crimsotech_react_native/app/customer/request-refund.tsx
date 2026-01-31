// import React from 'react';
// import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
// import { useAuth } from '../../contexts/AuthContext';

// export default function RequestRefundPage() {
//   const { userRole } = useAuth();

//   // Simple role guard: only users with role 'customer' may view this page
//   if (userRole && userRole !== 'customer') {
//     return (
//       <SafeAreaView style={styles.center}>
//         <Text style={styles.message}>Not authorized to view this page</Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.inner}>
//         <Text style={styles.title}>Refund Page</Text>
//         {/* TODO: Add listing components or fetch logic here */}
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#FFFFFF' },
//   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   inner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
//   title: { fontSize: 20, fontWeight: '600', color: '#111827' },
//   message: { fontSize: 16, color: '#6B7280' },
// });
