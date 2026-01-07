import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isLargeDevice = width > 414;

// Define types
type TrackingStatus = 'ordered' | 'processing' | 'shipped' | 'out-for-delivery' | 'delivered';

interface TrackingStep {
  id: string;
  status: TrackingStatus;
  title: string;
  description: string;
  date: string;
  time: string;
  active: boolean;
  completed: boolean;
}

interface LocationPoint {
  lat: number;
  lng: number;
  address: string;
  timestamp: string;
}

// Mock tracking data
const getMockTrackingData = (trackingNumber: string): { steps: TrackingStep[], locations: LocationPoint[] } => {
  return {
    steps: [
      {
        id: '1',
        status: 'ordered',
        title: 'Order Placed',
        description: 'Your order has been placed successfully',
        date: 'Nov 28, 2023',
        time: '10:24 AM',
        active: true,
        completed: true,
      },
      {
        id: '2',
        status: 'processing',
        title: 'Processing',
        description: 'Your order is being processed in our Manila warehouse',
        date: 'Nov 28, 2023',
        time: '2:15 PM',
        active: true,
        completed: true,
      },
      {
        id: '3',
        status: 'shipped',
        title: 'Shipped',
        description: 'Your order has been shipped from Manila Distribution Center',
        date: 'Nov 29, 2023',
        time: '8:30 AM',
        active: true,
        completed: true,
      },
      {
        id: '4',
        status: 'out-for-delivery',
        title: 'Out for Delivery',
        description: 'Your package is out for delivery in Metro Manila',
        date: 'Nov 30, 2023',
        time: '9:15 AM',
        active: true,
        completed: false,
      },
      {
        id: '5',
        status: 'delivered',
        title: 'Delivered',
        description: 'Your package has been delivered to your address',
        date: 'Nov 30, 2023',
        time: '1:45 PM',
        active: false,
        completed: false,
      },
    ],
    locations: [
      {
        lat: 14.5995,
        lng: 120.9842,
        address: 'Manila Distribution Center, Pasay City, Metro Manila',
        timestamp: 'Nov 29, 2023 08:30 AM',
      },
      {
        lat: 14.6760,
        lng: 121.0437,
        address: 'Quezon City Hub, Quezon City, Metro Manila',
        timestamp: 'Nov 29, 2023 11:20 AM',
      },
      {
        lat: 14.5547,
        lng: 121.0244,
        address: 'Makati Delivery Point, Makati City, Metro Manila',
        timestamp: 'Nov 30, 2023 09:15 AM',
      },
    ]
  };
};

export default function TrackingScreen() {
  const { trackingNumber } = useLocalSearchParams<{ trackingNumber: string }>();
  const [trackingData, setTrackingData] = useState<{ steps: TrackingStep[], locations: LocationPoint[] } | null>(null);
  
  useEffect(() => {
    if (trackingNumber) {
      // In a real app, we would fetch tracking data based on the trackingNumber
      // For this mock implementation, we'll return the same data regardless of tracking number
      setTrackingData(getMockTrackingData(trackingNumber.toString()));
    }
  }, [trackingNumber]);

  const getStatusIcon = (status: TrackingStatus) => {
    switch (status) {
      case 'ordered':
      case 'processing':
        return 'hourglass-top';
      case 'shipped':
        return 'local-shipping';
      case 'out-for-delivery':
        return 'directions-car';
      case 'delivered':
        return 'local-mall';
      default:
        return 'hourglass-top';
    }
  };

  const getStatusColor = (step: TrackingStep) => {
    if (step.completed) {
      return '#4CAF50'; // Completed steps are green
    } else if (step.active) {
      return '#2196F3'; // Active step is blue
    } else {
      return '#E0E0E0'; // Future steps are gray
    }
  };

  const getStatusCircleColor = (step: TrackingStep) => {
    if (step.completed) {
      return '#4CAF50'; // Completed steps have green circle
    } else if (step.active) {
      return '#FFFFFF'; // Active step has white circle
    } else {
      return '#E0E0E0'; // Future steps have light gray circle
    }
  };

  const getStatusCircleBorderColor = (step: TrackingStep) => {
    if (step.completed) {
      return '#4CAF50'; // Completed steps have green border
    } else if (step.active) {
      return '#2196F3'; // Active step has blue border
    } else {
      return '#E0E0E0'; // Future steps have light gray border
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Track Your Order</Text>
          {trackingNumber && (
            <View style={styles.trackingNumberContainer}>
              <Text style={styles.trackingNumberLabel}>Tracking Number:</Text>
              <Text style={styles.trackingNumber}>{trackingNumber}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.progressContainer}>
          {trackingData?.steps.map((step, index) => (
            <View key={step.id} style={styles.stepContainer}>
              <View style={styles.stepRow}>
                <View style={styles.stepIndicator}>
                  <View 
                    style={[
                      styles.statusCircle,
                      { 
                        backgroundColor: getStatusCircleColor(step),
                        borderColor: getStatusCircleBorderColor(step),
                        borderWidth: step.active || step.completed ? 2 : 1
                      }
                    ]}
                  >
                    {step.completed ? (
                      <MaterialIcons name="check" size={16} color="#fff" />
                    ) : (
                      <MaterialIcons 
                        name={getStatusIcon(step.status) as any} 
                        size={16} 
                        color={step.active ? '#2196F3' : '#BDBDBD'} 
                      />
                    )}
                  </View>
                  
                  {index !== trackingData.steps.length - 1 && (
                    <View 
                      style={[
                        styles.verticalLine,
                        { 
                          backgroundColor: getStatusColor(trackingData.steps[index + 1]),
                          height: isSmallDevice ? 20 : 24
                        }
                      ]} 
                    />
                  )}
                </View>
                
                <View style={styles.stepContent}>
                  <Text style={[
                    styles.stepTitle,
                    { color: step.completed ? '#212529' : '#757575' }
                  ]}>
                    {step.title}
                  </Text>
                  <Text style={styles.stepDescription}>
                    {step.description}
                  </Text>
                  <Text style={styles.stepTime}>
                    {step.date} • {step.time}
                  </Text>
                </View>
              </View>
              
              {index !== trackingData.steps.length - 1 && (
                <View 
                  style={[
                    styles.horizontalLine,
                    { 
                      backgroundColor: getStatusColor(step),
                      marginLeft: isSmallDevice ? 36 : 40
                    }
                  ]} 
                />
              )}
            </View>
          ))}
        </View>

        <View style={styles.locationContainer}>
          <Text style={styles.locationTitle}>Location History</Text>
          
          {trackingData?.locations.map((location, index) => (
            <View key={index} style={styles.locationItem}>
              <View style={styles.locationIcon}>
                <MaterialIcons name="location-pin" size={20} color="#2196F3" />
              </View>
              <View style={styles.locationDetails}>
                <Text style={styles.locationAddress}>{location.address}</Text>
                <Text style={styles.locationTime}>{location.timestamp}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.contactSupportContainer}>
          <Text style={styles.contactTitle}>Need Help?</Text>
          <Text style={styles.contactDescription}>
            If you have any questions about your order, our support team is ready to assist you.
          </Text>
          <View style={styles.contactButton}>
            <MaterialIcons name="support-agent" size={20} color="#fff" />
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: isSmallDevice ? 16 : 20,
    paddingVertical: isSmallDevice ? 16 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  headerContent: {
    marginBottom: isSmallDevice ? 8 : 12,
  },
  title: {
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: '700',
    color: '#212529',
    marginBottom: isSmallDevice ? 4 : 8,
    fontFamily: 'System',
  },
  trackingNumberContainer: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingVertical: isSmallDevice ? 6 : 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  trackingNumberLabel: {
    fontSize: isSmallDevice ? 11 : 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  trackingNumber: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '700',
    color: '#1976D2',
    fontFamily: 'System',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: isSmallDevice ? 12 : isLargeDevice ? 20 : 16,
    paddingTop: isSmallDevice ? 16 : 20,
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isSmallDevice ? 16 : 20,
    marginBottom: isSmallDevice ? 16 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  stepContainer: {
    marginBottom: isSmallDevice ? 20 : 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIndicator: {
    marginRight: isSmallDevice ? 12 : 16,
    alignItems: 'center',
  },
  statusCircle: {
    width: isSmallDevice ? 28 : 32,
    height: isSmallDevice ? 28 : 32,
    borderRadius: isSmallDevice ? 14 : 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  verticalLine: {
    position: 'absolute',
    top: isSmallDevice ? 32 : 36,
    left: isSmallDevice ? 13 : 15,
    width: 2,
    zIndex: 1,
  },
  stepContent: {
    flex: 1,
    marginBottom: isSmallDevice ? 8 : 12,
  },
  stepTitle: {
    fontSize: isSmallDevice ? 16 : 17,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'System',
  },
  stepDescription: {
    fontSize: isSmallDevice ? 14 : 15,
    color: '#6C757D',
    marginBottom: 4,
    fontFamily: 'System',
  },
  stepTime: {
    fontSize: isSmallDevice ? 12 : 13,
    color: '#9E9E9E',
    fontFamily: 'System',
  },
  horizontalLine: {
    height: 1,
    marginLeft: isSmallDevice ? 36 : 40,
  },
  locationContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isSmallDevice ? 16 : 20,
    marginBottom: isSmallDevice ? 16 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  locationTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '600',
    color: '#212529',
    marginBottom: isSmallDevice ? 16 : 20,
    fontFamily: 'System',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: isSmallDevice ? 16 : 20,
  },
  locationIcon: {
    marginRight: isSmallDevice ? 12 : 16,
    marginTop: 2,
  },
  locationDetails: {
    flex: 1,
  },
  locationAddress: {
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '500',
    color: '#212529',
    marginBottom: 4,
    fontFamily: 'System',
  },
  locationTime: {
    fontSize: isSmallDevice ? 13 : 14,
    color: '#6C757D',
    fontFamily: 'System',
  },
  contactSupportContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isSmallDevice ? 16 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  contactTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
    fontFamily: 'System',
  },
  contactDescription: {
    fontSize: isSmallDevice ? 14 : 15,
    color: '#6C757D',
    lineHeight: isSmallDevice ? 20 : 22,
    marginBottom: isSmallDevice ? 16 : 20,
    fontFamily: 'System',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#42A5F5',
    paddingHorizontal: isSmallDevice ? 20 : 24,
    paddingVertical: isSmallDevice ? 12 : 14,
    borderRadius: 12,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: 'System',
  },
});