import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

interface MapPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: { latitude: number; longitude: number; address: string }) => void;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
}

// Add your Google Cloud API Key here
const GOOGLE_MAPS_API_KEY = 'AIzaSyBJD7F6025lQEecWMRqgIyViOv9Q9SeHKc'; // Replace with your actual API key

export default function MapPickerModal({
  visible,
  onClose,
  onSelect,
  initialLatitude,
  initialLongitude,
}: MapPickerModalProps) {
  const [region, setRegion] = useState({
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialLatitude && initialLongitude) {
        const location = {
          latitude: initialLatitude,
          longitude: initialLongitude,
        };
        setSelectedLocation(location);
        setRegion({
          ...location,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        reverseGeocodeWithGoogle(location.latitude, location.longitude);
      } else {
        getCurrentLocation();
      }
    }
  }, [visible]);

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to pin your address');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setSelectedLocation(newLocation);
      setRegion({
        ...newLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      reverseGeocodeWithGoogle(newLocation.latitude, newLocation.longitude);
    } catch (error) {
      Alert.alert('Error', 'Failed to get your location');
    } finally {
      setLoading(false);
    }
  };

  // Google Maps Geocoding API
  const reverseGeocodeWithGoogle = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&language=en`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const formattedAddress = data.results[0].formatted_address;
        setAddress(formattedAddress);
        
        // Extract address components for more detailed info if needed
        const addressComponents = data.results[0].address_components;
        console.log('Address Components:', addressComponents);
      } else {
        // Fallback to Expo Location if Google fails
        const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addresses.length > 0) {
          const addr = addresses[0];
          const formattedAddress = [
            addr.name,
            addr.street,
            addr.district,
            addr.city,
            addr.region,
            addr.country,
          ].filter(Boolean).join(', ');
          setAddress(formattedAddress);
        }
      }
    } catch (error) {
      console.error('Google reverse geocoding error:', error);
      // Fallback to Expo Location
      try {
        const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (addresses.length > 0) {
          const addr = addresses[0];
          const formattedAddress = [
            addr.name,
            addr.street,
            addr.district,
            addr.city,
            addr.region,
          ].filter(Boolean).join(', ');
          setAddress(formattedAddress);
        }
      } catch (fallbackError) {
        console.error('Fallback geocoding error:', fallbackError);
        setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }
    }
  };

  // Google Maps Places Autocomplete
  const searchPlaces = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&key=${GOOGLE_MAPS_API_KEY}&components=country:PH&types=geocode|address`
      );
      const data = await response.json();
      
      if (data.status === 'OK') {
        setSearchResults(data.predictions);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Place search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const getPlaceDetails = async (placeId: string) => {
    setSearching(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        const location = data.result.geometry.location;
        const newLocation = {
          latitude: location.lat,
          longitude: location.lng,
        };
        setSelectedLocation(newLocation);
        setRegion({
          ...newLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setAddress(data.result.formatted_address);
        setShowSearchResults(false);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Place details error:', error);
      Alert.alert('Error', 'Failed to get location details');
    } finally {
      setSearching(false);
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    reverseGeocodeWithGoogle(latitude, longitude);
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onSelect({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        address: address,
      });
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pin Your Location</Text>
          <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a location..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              searchPlaces(text);
            }}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setSearchResults([]);
              setShowSearchResults(false);
            }}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results */}
        {showSearchResults && searchResults.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <ScrollView
              style={styles.searchResultsList}
              keyboardShouldPersistTaps="handled"
            >
              {searchResults.map((item) => (
                <TouchableOpacity
                  key={item.place_id}
                  style={styles.searchResultItem}
                  onPress={() => getPlaceDetails(item.place_id)}
                >
                  <Ionicons name="location-outline" size={20} color="#F97316" />
                  <View style={styles.searchResultTextContainer}>
                    <Text style={styles.searchResultMainText}>{item.structured_formatting?.main_text || item.description}</Text>
                    <Text style={styles.searchResultSecondaryText} numberOfLines={1}>
                      {item.structured_formatting?.secondary_text || ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {loading || searching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.loadingText}>
              {loading ? 'Getting your location...' : 'Searching...'}
            </Text>
          </View>
        ) : (
          <>
            <MapView
              style={styles.map}
              region={region}
              onPress={handleMapPress}
              showsUserLocation={true}
              showsMyLocationButton={true}
              provider={PROVIDER_GOOGLE}
            >
              {selectedLocation && (
                <Marker
                  coordinate={selectedLocation}
                  draggable
                  onDragEnd={(e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setSelectedLocation({ latitude, longitude });
                    reverseGeocodeWithGoogle(latitude, longitude);
                  }}
                >
                  <View style={styles.marker}>
                    <Ionicons name="location" size={32} color="#F97316" />
                  </View>
                </Marker>
              )}
            </MapView>

            {address && (
              <View style={styles.addressCard}>
                <Ionicons name="location-outline" size={20} color="#F97316" />
                <Text style={styles.addressText} numberOfLines={3}>
                  {address}
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.myLocationButton} onPress={getCurrentLocation}>
              <Ionicons name="locate" size={24} color="#F97316" />
            </TouchableOpacity>

            <Text style={styles.hintText}>
              💡 Tap on map to pin or drag the pin
            </Text>
          </>
        )}
      </View>
    </Modal>
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
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  confirmButton: {
    padding: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F97316',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  searchResultsContainer: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxHeight: 300,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  searchResultsList: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  searchResultTextContainer: {
    flex: 1,
  },
  searchResultMainText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  searchResultSecondaryText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  map: {
    flex: 1,
  },
  marker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#F97316',
  },
  addressCard: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  hintText: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 8,
    marginHorizontal: 20,
    borderRadius: 20,
  },
});

// Add ScrollView import at the top
import { ScrollView } from 'react-native';