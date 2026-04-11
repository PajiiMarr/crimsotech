import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type Coordinates = {
  latitude: number;
  longitude: number;
};

export default function RiderMapScreen() {
  const { destLat, destLng, sellerLat, sellerLng, customerAddress, sellerAddress, deliveryId } = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);
  
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinates[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [distanceToDestination, setDistanceToDestination] = useState<number | null>(null);

  // Parse destination coordinates from params
  useEffect(() => {
    if (destLat && destLng) {
      setDestination({
        latitude: parseFloat(destLat as string),
        longitude: parseFloat(destLng as string),
      });
    }
  }, [destLat, destLng]);

  // Get current location and start tracking
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for navigation');
        return;
      }

      // Get initial location
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      // Start watching position for real-time updates
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (newLocation) => {
          const newCoords = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          };
          setCurrentLocation(newCoords);
          
          if (destination) {
            const distance = calculateDistanceBetween(
              newCoords.latitude, newCoords.longitude,
              destination.latitude, destination.longitude
            );
            setDistanceToDestination(distance);
            
            if (distance <= 0.05 && !hasArrived) {
              setHasArrived(true);
              Alert.alert(
                '📍 Arrived at Destination!',
                'You have reached the customer\'s location.',
                [{ text: 'OK' }]
              );
            } else if (distance > 0.05 && hasArrived) {
              setHasArrived(false);
            }
          }
        }
      );
      setLocationSubscription(subscription);

      return () => {
        if (subscription) {
          subscription.remove();
        }
      };
    })();
  }, [destination]);

  // Fetch route when both locations are available
  useEffect(() => {
    if (currentLocation && destination) {
      fetchRoute();
    }
  }, [currentLocation, destination]);

  const fetchRoute = async () => {
    if (!currentLocation || !destination) return;
    
    setIsLoadingRoute(true);
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${currentLocation.longitude},${currentLocation.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`
      );
      
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        const coordinates = data.routes[0].geometry.coordinates.map((coord: number[]) => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        setRouteCoordinates(coordinates);
        
        if (mapRef.current && coordinates.length > 0) {
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      Alert.alert('Error', 'Failed to load route');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const calculateDistanceBetween = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const centerOnCurrentLocation = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const calculateDistance = () => {
    if (!currentLocation || !destination) return null;
    return calculateDistanceBetween(
      currentLocation.latitude, currentLocation.longitude,
      destination.latitude, destination.longitude
    ).toFixed(1);
  };

  const handleMarkAsArrived = () => {
    setHasArrived(true);
    Alert.alert(
      '✅ Arrived at Destination',
      'You have marked yourself as arrived at the customer\'s location.',
      [{ text: 'OK' }]
    );
  };

  // Handle mark as delivered - Navigate to add proof page (same as RiderViewOrder)
  const handleMarkDelivered = () => {
    if (!deliveryId) {
      Alert.alert('Error', 'Delivery ID not found');
      return;
    }
    
    router.push({
      pathname: '/rider/add-proof',
      params: { deliveryId: deliveryId as string }
    });
  };

  if (!currentLocation || !destination) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading map...</Text>
      </View>
    );
  }

  const distance = calculateDistance();
  const isVeryClose = distanceToDestination !== null && distanceToDestination <= 0.05;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Navigation</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Customer Address Bar */}
      {customerAddress && (
        <View style={styles.addressBar}>
          <Ionicons name="location-outline" size={20} color="#EE4D2D" />
          <Text style={styles.addressText} numberOfLines={1}>
            {customerAddress}
          </Text>
        </View>
      )}

      {/* Arrival Status Banner */}
      {hasArrived && (
        <View style={styles.arrivedBanner}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.arrivedText}>You have arrived at the destination!</Text>
        </View>
      )}

      {isVeryClose && !hasArrived && (
        <View style={styles.nearBanner}>
          <Ionicons name="location" size={24} color="#F59E0B" />
          <Text style={styles.nearText}>You are near the destination</Text>
        </View>
      )}

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        <Marker coordinate={destination} title="Customer">
          <View style={[styles.destinationMarker, hasArrived && styles.destinationMarkerArrived]}>
            <Ionicons name="flag" size={24} color={hasArrived ? "#10B981" : "#EE4D2D"} />
          </View>
        </Marker>

        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={4}
            strokeColor={hasArrived ? "#10B981" : "#3B82F6"}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

      {/* Bottom Navigation Card */}
      <View style={styles.bottomCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="navigate-circle" size={24} color="#3B82F6" />
            <Text style={styles.infoLabel}>Distance</Text>
            <Text style={[styles.infoValue, isVeryClose && styles.infoValueClose]}>
              {distanceToDestination !== null && distanceToDestination <= 0.1 
                ? `${(distanceToDestination * 1000).toFixed(0)} m` 
                : `${distance} km`}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={24} color="#3B82F6" />
            <Text style={styles.infoLabel}>Est. Time</Text>
            <Text style={styles.infoValue}>
              {distance ? `${Math.ceil(parseFloat(distance) * 3)} min` : '--'}
            </Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={centerOnCurrentLocation}
            style={styles.centerButton}
          >
            <Ionicons name="locate" size={20} color="#3B82F6" />
            <Text style={styles.centerButtonText}>My Location</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={fetchRoute}
            style={styles.refreshButton}
          >
            <Ionicons name="refresh" size={20} color="#10B981" />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* I have arrived button - shows when close to destination */}
        {(isVeryClose || hasArrived) && !hasArrived && (
          <TouchableOpacity
            onPress={handleMarkAsArrived}
            style={styles.arrivedButton}
          >
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <Text style={styles.arrivedButtonText}>I have arrived at the destination</Text>
          </TouchableOpacity>
        )}

        {/* Mark as Delivered button - shows after arrival (same as RiderViewOrder) */}
        {hasArrived && (
          <TouchableOpacity
            onPress={handleMarkDelivered}
            style={styles.deliverButton}
          >
            <Ionicons name="checkmark-done-circle" size={24} color="#FFFFFF" />
            <Text style={styles.deliverButtonText}>Mark as Delivered</Text>
          </TouchableOpacity>
        )}

        {isLoadingRoute && (
          <View style={styles.loadingOverlay}>
            <Text>Loading route...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  addressText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#4B5563',
  },
  arrivedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  arrivedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  nearBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  nearText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  map: {
    flex: 1,
  },
  destinationMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#EE4D2D',
  },
  destinationMarkerArrived: {
    borderColor: '#10B981',
    backgroundColor: '#D1FAE5',
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },
  infoValueClose: {
    color: '#10B981',
  },
  divider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  centerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  centerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  refreshButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  arrivedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 12,
  },
  arrivedButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deliverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EE4D2D',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 12,
  },
  deliverButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});