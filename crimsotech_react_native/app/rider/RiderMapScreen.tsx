import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Your Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyBJD7F6025lQEecWMRqgIyViOv9Q9SeHKc';

type Coordinates = {
  latitude: number;
  longitude: number;
};

interface RouteInfo {
  distance: string;
  duration: string;
  distanceValue: number; // in meters
  durationValue: number; // in seconds
  polyline: string;
}

export default function RiderMapScreen() {
  const { 
    destLat, 
    destLng, 
    sellerLat, 
    sellerLng, 
    customerAddress, 
    sellerAddress, 
    deliveryId,
    orderId  // Add this to your params
  } = useLocalSearchParams();
  
  const mapRef = useRef<MapView>(null);
  
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [destination, setDestination] = useState<Coordinates | null>(null);
  const [pickupLocation, setPickupLocation] = useState<Coordinates | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinates[]>([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [distanceToDestination, setDistanceToDestination] = useState<number | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [showPickupFirst, setShowPickupFirst] = useState(false);
  const [isNavigatingToPickup, setIsNavigatingToPickup] = useState(false);
  const [hasReachedPickup, setHasReachedPickup] = useState(false);

  // Parse destination coordinates from params (buyer's pinned location)
  useEffect(() => {
    if (destLat && destLng) {
      const destCoords = {
        latitude: parseFloat(destLat as string),
        longitude: parseFloat(destLng as string),
      };
      setDestination(destCoords);
      console.log('📍 Buyer destination coordinates (pinned location):', destCoords);
    } else {
      console.warn('⚠️ No pinned location coordinates provided for buyer');
    }
    
    // Parse seller coordinates if available
    if (sellerLat && sellerLng) {
      const sellerCoords = {
        latitude: parseFloat(sellerLat as string),
        longitude: parseFloat(sellerLng as string),
      };
      setPickupLocation(sellerCoords);
      console.log('🏪 Seller pickup coordinates:', sellerCoords);
    }
  }, [destLat, destLng, sellerLat, sellerLng]);

  // Determine if we need to go to pickup first
  useEffect(() => {
    if (pickupLocation && destination && currentLocation) {
      // Check if rider is near pickup location
      const distanceToPickup = calculateDistanceBetween(
        currentLocation.latitude, currentLocation.longitude,
        pickupLocation.latitude, pickupLocation.longitude
      );
      
      // If not near pickup and pickup exists, navigate to pickup first
      if (distanceToPickup > 0.1 && !hasReachedPickup) {
        setShowPickupFirst(true);
        setIsNavigatingToPickup(true);
      } else if (distanceToPickup <= 0.1) {
        setHasReachedPickup(true);
        setIsNavigatingToPickup(false);
        setShowPickupFirst(false);
      }
    }
  }, [currentLocation, pickupLocation, destination, hasReachedPickup]);

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
    
    // Check arrival at destination (buyer location)
    if (destination) {
      const distance = calculateDistanceBetween(
        newCoords.latitude, newCoords.longitude,
        destination.latitude, destination.longitude
      );
      setDistanceToDestination(distance);
      
      // REMOVED the auto Alert.alert - now only updates distance without popup
      if (distance <= 0.05 && !hasArrived) {
        setHasArrived(true);
        // Alert removed - user will use manual button instead
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

  // Fetch route using Google Maps Directions API
  const fetchRoute = async () => {
    if (!currentLocation || !destination) {
      Alert.alert('Error', 'Cannot fetch route: missing location information');
      return;
    }
    
    setIsLoadingRoute(true);
    try {
      let origin = `${currentLocation.latitude},${currentLocation.longitude}`;
      let waypoints = [];
      let finalDestination = destination;
      
      // If we need to go to pickup first and pickup exists
      if (isNavigatingToPickup && pickupLocation && !hasReachedPickup) {
        waypoints.push(`${pickupLocation.latitude},${pickupLocation.longitude}`);
        finalDestination = pickupLocation; // First navigate to pickup
      }
      
      // Build URL with waypoints if needed
      let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${finalDestination.latitude},${finalDestination.longitude}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`;
      
      if (waypoints.length > 0) {
        url += `&waypoints=${waypoints.join('|')}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.routes && data.routes[0]) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        // Parse route info
        setRouteInfo({
          distance: leg.distance.text,
          duration: leg.duration.text,
          distanceValue: leg.distance.value,
          durationValue: leg.duration.value,
          polyline: route.overview_polyline.points,
        });
        
        // Decode polyline for map display
        const coordinates = decodePolyline(route.overview_polyline.points);
        setRouteCoordinates(coordinates);
        
        // Fit map to show entire route
        if (mapRef.current && coordinates.length > 0) {
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }
        
        // Show which destination we're navigating to
        if (isNavigatingToPickup && !hasReachedPickup) {
          console.log('🗺️ Navigating to pickup location first');
        } else {
          console.log('🗺️ Navigating directly to customer location');
        }
      } else {
        console.error('Google Directions API error:', data.status, data.error_message);
        Alert.alert('Error', `Failed to get route: ${data.error_message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      Alert.alert('Error', 'Failed to load route. Please check your connection.');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Decode Google Maps polyline
  const decodePolyline = (encoded: string): Coordinates[] => {
    const points: Coordinates[] = [];
    let index = 0, lat = 0, lng = 0;
    
    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      
      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      
      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return points;
  };

  const calculateDistanceBetween = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
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
    const target = isNavigatingToPickup && pickupLocation && !hasReachedPickup ? pickupLocation : destination;
    return calculateDistanceBetween(
      currentLocation.latitude, currentLocation.longitude,
      target.latitude, target.longitude
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

  const handleMarkAsReachedPickup = () => {
    setHasReachedPickup(true);
    setIsNavigatingToPickup(false);
    setShowPickupFirst(false);
    Alert.alert(
      '📦 Reached Pickup Location',
      'You have arrived at the seller\'s location. You can now pick up the items.',
      [{ text: 'OK', onPress: () => fetchRoute() }] // Refresh route to customer
    );
  };

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

  const openGoogleMapsApp = () => {
    if (!destination) return;
    
    const target = isNavigatingToPickup && pickupLocation && !hasReachedPickup ? pickupLocation : destination;
    const url = Platform.select({
      ios: `maps://?daddr=${target.latitude},${target.longitude}&dirflg=d`,
      android: `google.navigation:q=${target.latitude},${target.longitude}&mode=d`,
    });
    
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Could not open Google Maps');
      });
    }
  };

  // Fetch route when locations change
  useEffect(() => {
    if (currentLocation && destination) {
      fetchRoute();
    }
  }, [currentLocation, destination, isNavigatingToPickup, hasReachedPickup]);

  if (!currentLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EE4D2D" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  if (!destination) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="location-outline" size={48} color="#9CA3AF" />
        <Text style={styles.loadingText}>Customer location not available</Text>
        <Text style={styles.loadingSubtext}>The buyer hasn't pinned their exact location.</Text>
        <Text style={styles.loadingSubtext}>Please contact the buyer for directions.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonMap}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const distance = calculateDistance();
  const isVeryClose = distanceToDestination !== null && distanceToDestination <= 0.05;
  const isNearPickup = currentLocation && pickupLocation && calculateDistanceBetween(
    currentLocation.latitude, currentLocation.longitude,
    pickupLocation.latitude, pickupLocation.longitude
  ) <= 0.05;

  const currentTarget = isNavigatingToPickup && pickupLocation && !hasReachedPickup ? pickupLocation : destination;
  const targetAddress = isNavigatingToPickup && !hasReachedPickup ? sellerAddress : customerAddress;
  const targetType = isNavigatingToPickup && !hasReachedPickup ? 'Pickup Location (Seller)' : 'Customer Location';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isNavigatingToPickup && !hasReachedPickup ? 'Navigate to Pickup' : 'Navigate to Customer'}
        </Text>
        <TouchableOpacity onPress={openGoogleMapsApp} style={styles.externalButton}>
          <Ionicons name="navigate-outline" size={22} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Target Address Bar */}
      {targetAddress && (
        <View style={styles.addressBar}>
          <Ionicons name="location-outline" size={20} color={isNavigatingToPickup ? "#3B82F6" : "#EE4D2D"} />
          <Text style={styles.addressText} numberOfLines={2}>
            {targetType}: {targetAddress}
          </Text>
        </View>
      )}

      {/* Pickup Reached Banner */}
      {hasReachedPickup && (
        <View style={styles.pickupReachedBanner}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.pickupReachedText}>Pickup completed! Heading to customer now.</Text>
        </View>
      )}

      {/* Arrival Status Banner */}
      {hasArrived && (
        <View style={styles.arrivedBanner}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.arrivedText}>You have arrived at the customer's location!</Text>
        </View>
      )}

      {isVeryClose && !hasArrived && !isNavigatingToPickup && (
        <View style={styles.nearBanner}>
          <Ionicons name="location" size={24} color="#F59E0B" />
          <Text style={styles.nearText}>You are near the customer's location</Text>
        </View>
      )}

      {isNearPickup && isNavigatingToPickup && !hasReachedPickup && (
        <View style={styles.nearPickupBanner}>
          <Ionicons name="storefront" size={24} color="#10B981" />
          <Text style={styles.nearPickupText}>You are near the pickup location!</Text>
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
        {/* Destination Marker (Customer) */}
        <Marker coordinate={destination} title="Customer">
          <View style={[styles.destinationMarker, hasArrived && styles.destinationMarkerArrived]}>
            <Ionicons name="flag" size={24} color={hasArrived ? "#10B981" : "#EE4D2D"} />
          </View>
        </Marker>

        {/* Pickup Marker (Seller) */}
        {pickupLocation && !hasReachedPickup && (
          <Marker coordinate={pickupLocation} title="Pickup Location (Seller)">
            <View style={styles.pickupMarker}>
              <Ionicons name="storefront" size={24} color="#3B82F6" />
            </View>
          </Marker>
        )}

        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={4}
            strokeColor={hasArrived ? "#10B981" : (isNavigatingToPickup ? "#3B82F6" : "#EE4D2D")}
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
            <Text style={[styles.infoValue, (isVeryClose || isNearPickup) && styles.infoValueClose]}>
              {routeInfo?.distance || (distance ? `${distance} km` : '--')}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={24} color="#3B82F6" />
            <Text style={styles.infoLabel}>Est. Time</Text>
            <Text style={styles.infoValue}>
              {routeInfo?.duration || (distance ? `${Math.ceil(parseFloat(distance) * 3)} min` : '--')}
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
            <Text style={styles.refreshButtonText}>Refresh Route</Text>
          </TouchableOpacity>
        </View>

        {/* I have arrived at pickup button */}
        {isNavigatingToPickup && !hasReachedPickup && isNearPickup && (
          <TouchableOpacity
            onPress={handleMarkAsReachedPickup}
            style={styles.pickupButton}
          >
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <Text style={styles.pickupButtonText}>I have arrived at pickup location</Text>
          </TouchableOpacity>
        )}

        {/* I have arrived at destination button */}
        {(isVeryClose || hasArrived) && !hasArrived && !isNavigatingToPickup && (
          <TouchableOpacity
            onPress={handleMarkAsArrived}
            style={styles.arrivedButton}
          >
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <Text style={styles.arrivedButtonText}>I have arrived at the destination</Text>
          </TouchableOpacity>
        )}

        {/* Mark as Delivered button - shows after arrival */}
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
            <ActivityIndicator size="large" color="#EE4D2D" />
            <Text style={styles.loadingOverlayText}>Loading route...</Text>
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
    paddingTop: Platform.OS === 'ios' ? 12 : 40,
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
  externalButton: {
    padding: 8,
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
  pickupReachedBanner: {
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
  pickupReachedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
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
  nearPickupBanner: {
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
  nearPickupText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
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
  pickupMarker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
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
  pickupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    marginTop: 12,
  },
  pickupButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
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
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  backButtonMap: {
    marginTop: 24,
    backgroundColor: '#EE4D2D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  loadingOverlayText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});