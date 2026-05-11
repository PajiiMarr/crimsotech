import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

interface MapPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: {
    latitude: number;
    longitude: number;
    address: string;
    barangay?: string;
    street?: string;
    city?: string;
    province?: string;
  }) => void;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
}

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Zamboanga City boundaries (approximate bounding box)
// These coordinates roughly cover Zamboanga City area
const ZAMBOANGA_CITY_BOUNDS = {
  minLat: 6.9000,
  maxLat: 7.4000,
  minLng: 121.9000,
  maxLng: 122.3000,
};

// Zamboanga City names (case-insensitive matching)
const ZAMBOANGA_CITY_NAMES = [
  "zamboanga city",
  "city of zamboanga",
  "zamboanga",
  "zamboanga del sur",
];

export default function MapPickerModal({
  visible,
  onClose,
  onSelect,
  initialLatitude,
  initialLongitude,
}: MapPickerModalProps) {
  const [region, setRegion] = useState({
    latitude: 7.1900, // Centered on Zamboanga City
    longitude: 122.1000,
    latitudeDelta: 0.2,
    longitudeDelta: 0.2,
  });
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isLocationValid, setIsLocationValid] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");

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
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
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
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Allow location access to pin your address",
        );
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
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      reverseGeocodeWithGoogle(newLocation.latitude, newLocation.longitude);
    } catch (error) {
      Alert.alert("Error", "Failed to get your location");
    } finally {
      setLoading(false);
    }
  };

  // Check if location is within Zamboanga City
  const isValidZamboangaCity = (city: string, province: string, lat: number, lng: number): boolean => {
    // Check by coordinates first
    const isWithinBounds = 
      lat >= ZAMBOANGA_CITY_BOUNDS.minLat &&
      lat <= ZAMBOANGA_CITY_BOUNDS.maxLat &&
      lng >= ZAMBOANGA_CITY_BOUNDS.minLng &&
      lng <= ZAMBOANGA_CITY_BOUNDS.maxLng;
    
    // Check by city/province name
    const cityLower = (city || "").toLowerCase();
    const provinceLower = (province || "").toLowerCase();
    
    const isNameMatch = ZAMBOANGA_CITY_NAMES.some(name => 
      cityLower.includes(name) || provinceLower.includes(name)
    );
    
    return isWithinBounds && isNameMatch;
  };

  // Improved address component extraction for Philippine addresses
  const extractAddressComponents = (addressComponents: any[]) => {
    let barangay = "";
    let street = "";
    let city = "";
    let province = "";

    for (const component of addressComponents) {
      const types = component.types;
      
      if (types.includes("sublocality") || 
          types.includes("sublocality_level_1") || 
          types.includes("sublocality_level_2") ||
          types.includes("neighborhood")) {
        barangay = component.long_name;
      }
      
      if (types.includes("route") || types.includes("premise")) {
        street = component.long_name;
      }
      
      if (types.includes("locality") || types.includes("administrative_area_level_3")) {
        city = component.long_name;
      }
      
      if (types.includes("administrative_area_level_1")) {
        province = component.long_name;
      }
    }
    
    if (!barangay) {
      for (const component of addressComponents) {
        const types = component.types;
        if (types.includes("administrative_area_level_4")) {
          barangay = component.long_name;
          break;
        }
      }
    }

    barangay = barangay.replace(/^(Barangay|Brgy\.?)\s*/i, "").trim();
    
    return { barangay, street, city, province };
  };

  // Validate location and show message
  const validateAndSetLocation = (city: string, province: string, lat: number, lng: number) => {
    const isValid = isValidZamboangaCity(city, province, lat, lng);
    setIsLocationValid(isValid);
    
    if (!isValid) {
      setValidationMessage("⚠️ Location must be within Zamboanga City only");
    } else {
      setValidationMessage("✓ Valid Zamboanga City location");
    }
    
    return isValid;
  };

  // Google Maps Geocoding API
  const reverseGeocodeWithGoogle = async (
    latitude: number,
    longitude: number,
  ) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}&language=en`,
      );
      const data = await response.json();

      if (data.status === "OK" && data.results.length > 0) {
        const formattedAddress = data.results[0].formatted_address;
        const addressComponents = data.results[0].address_components;
        const { barangay, street, city, province } =
          extractAddressComponents(addressComponents);

        setAddress(formattedAddress);
        
        // Validate location
        const isValid = validateAndSetLocation(city, province, latitude, longitude);

        setSelectedLocation((prev) =>
          prev
            ? {
                ...prev,
                _addressData: {
                  barangay,
                  street,
                  city,
                  province,
                  formattedAddress,
                  isValid,
                },
              }
            : prev,
        );
      } else {
        // Fallback to Expo Location if Google fails
        const addresses = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (addresses.length > 0) {
          const addr = addresses[0];
          const formattedAddress = [
            addr.name,
            addr.street,
            addr.district,
            addr.city,
            addr.region,
            addr.country,
          ]
            .filter(Boolean)
            .join(", ");
          setAddress(formattedAddress);
          
          const isValid = validateAndSetLocation(addr.city || "", addr.region || "", latitude, longitude);
          
          setSelectedLocation((prev) =>
            prev
              ? {
                  ...prev,
                  _addressData: {
                    barangay: addr.district || "",
                    street: addr.street || "",
                    city: addr.city || "",
                    province: addr.region || "",
                    formattedAddress,
                    isValid,
                  },
                }
              : prev,
          );
        }
      }
    } catch (error) {
      console.error("Google reverse geocoding error:", error);
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (addresses.length > 0) {
          const addr = addresses[0];
          const formattedAddress = [
            addr.name,
            addr.street,
            addr.district,
            addr.city,
            addr.region,
          ]
            .filter(Boolean)
            .join(", ");
          setAddress(formattedAddress);
          
          const isValid = validateAndSetLocation(addr.city || "", addr.region || "", latitude, longitude);
          
          setSelectedLocation((prev) =>
            prev
              ? {
                  ...prev,
                  _addressData: {
                    barangay: addr.district || "",
                    street: addr.street || "",
                    city: addr.city || "",
                    province: addr.region || "",
                    formattedAddress,
                    isValid,
                  },
                }
              : prev,
          );
        }
      } catch (fallbackError) {
        console.error("Fallback geocoding error:", fallbackError);
        setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setIsLocationValid(false);
        setValidationMessage("⚠️ Unable to verify location. Please select a location within Zamboanga City.");
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
      // Add Zamboanga City context to search
      const searchQueryWithContext = `${query} Zamboanga City`;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          searchQueryWithContext,
        )}&key=${GOOGLE_MAPS_API_KEY}&components=country:PH&types=geocode|address`,
      );
      const data = await response.json();

      if (data.status === "OK") {
        // Filter results to only show Zamboanga City related locations
        const filteredResults = data.predictions.filter((prediction: any) => {
          const description = prediction.description.toLowerCase();
          return ZAMBOANGA_CITY_NAMES.some(name => description.includes(name));
        });
        setSearchResults(filteredResults);
        setShowSearchResults(filteredResults.length > 0);
        
        if (filteredResults.length === 0 && data.predictions.length > 0) {
          setValidationMessage("⚠️ Please search for a location within Zamboanga City");
        }
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Place search error:", error);
    } finally {
      setSearching(false);
    }
  };

  const getPlaceDetails = async (placeId: string) => {
    setSearching(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`,
      );
      const data = await response.json();

      if (data.status === "OK" && data.result) {
        const location = data.result.geometry.location;
        const newLocation = {
          latitude: location.lat,
          longitude: location.lng,
        };
        setSelectedLocation(newLocation);
        setRegion({
          ...newLocation,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
        setAddress(data.result.formatted_address);

        if (data.result.address_components) {
          const { barangay, street, city, province } = extractAddressComponents(
            data.result.address_components,
          );
          
          // Validate location
          const isValid = validateAndSetLocation(city, province, location.lat, location.lng);
          
          setSelectedLocation((prev) =>
            prev
              ? {
                  ...prev,
                  _addressData: {
                    barangay,
                    street,
                    city,
                    province,
                    formattedAddress: data.result.formatted_address,
                    isValid,
                  },
                }
              : prev,
          );
        }

        setShowSearchResults(false);
        setSearchQuery("");
      }
    } catch (error) {
      console.error("Place details error:", error);
      Alert.alert("Error", "Failed to get location details");
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
    if (!selectedLocation) {
      Alert.alert("Error", "Please select a location first");
      return;
    }
    
    const addressData = (selectedLocation as any)._addressData || {};
    
    // Check if location is valid before confirming
    if (!isLocationValid) {
      Alert.alert(
        "Invalid Location",
        "Please select a location within Zamboanga City only. Delivery is only available within Zamboanga City.\n\nWould you like to choose a different location?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Choose Again", onPress: () => {} }
        ]
      );
      return;
    }
    
    console.log("📦 Confirming location with data:", {
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      address: address,
      barangay: addressData.barangay || "",
      street: addressData.street || "",
      city: addressData.city || "",
      province: addressData.province || "",
      isValid: isLocationValid,
    });
    
    onSelect({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      address: address,
      barangay: addressData.barangay || "",
      street: addressData.street || "",
      city: addressData.city || "",
      province: addressData.province || "",
    });
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
          <TouchableOpacity
            onPress={handleConfirm}
            style={[styles.confirmButton, !isLocationValid && styles.confirmButtonDisabled]}
            disabled={!isLocationValid}
          >
            <Text style={[styles.confirmButtonText, !isLocationValid && styles.confirmButtonTextDisabled]}>
              Confirm
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#9CA3AF"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a location in Zamboanga City..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              searchPlaces(text);
            }}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSearchResults([]);
                setShowSearchResults(false);
              }}
            >
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
                    <Text style={styles.searchResultMainText}>
                      {item.structured_formatting?.main_text ||
                        item.description}
                    </Text>
                    <Text
                      style={styles.searchResultSecondaryText}
                      numberOfLines={1}
                    >
                      {item.structured_formatting?.secondary_text || ""}
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
              {loading ? "Getting your location..." : "Searching..."}
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
                  pinColor={isLocationValid ? "#F97316" : "#EF4444"}
                  anchor={{ x: 0.5, y: 1 }}
                  tracksViewChanges={false}
                  onDragEnd={(e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setSelectedLocation({ latitude, longitude });
                    reverseGeocodeWithGoogle(latitude, longitude);
                  }}
                />
              )}
            </MapView>

            {/* Validation Message Card */}
            {validationMessage ? (
              <View style={[
                styles.validationCard,
                isLocationValid ? styles.validationCardSuccess : styles.validationCardError
              ]}>
                <Ionicons 
                  name={isLocationValid ? "checkmark-circle" : "warning"} 
                  size={20} 
                  color={isLocationValid ? "#10B981" : "#EF4444"} 
                />
                <Text style={[
                  styles.validationText,
                  isLocationValid ? styles.validationTextSuccess : styles.validationTextError
                ]}>
                  {validationMessage}
                </Text>
              </View>
            ) : null}

            {address && (
              <View style={styles.addressCard}>
                <Ionicons name="location-outline" size={20} color="#F97316" />
                <Text style={styles.addressText} numberOfLines={3}>
                  {address}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.myLocationButton}
              onPress={getCurrentLocation}
            >
              <Ionicons name="locate" size={24} color="#F97316" />
            </TouchableOpacity>

            <Text style={styles.hintText}>
              💡 Only locations within Zamboanga City are allowed
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
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  confirmButton: {
    padding: 8,
    backgroundColor: "#F97316",
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  confirmButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  confirmButtonTextDisabled: {
    color: "#9CA3AF",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  searchResultsContainer: {
    position: "absolute",
    top: 120,
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    maxHeight: 300,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  searchResultsList: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  searchResultTextContainer: {
    flex: 1,
  },
  searchResultMainText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  searchResultSecondaryText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  map: {
    flex: 1,
  },
  validationCard: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  validationCardSuccess: {
    backgroundColor: "#D1FAE5",
    borderWidth: 1,
    borderColor: "#10B981",
  },
  validationCardError: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  validationText: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  validationTextSuccess: {
    color: "#065F46",
  },
  validationTextError: {
    color: "#991B1B",
  },
  addressCard: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  myLocationButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  hintText: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingVertical: 8,
    marginHorizontal: 20,
    borderRadius: 20,
  },
});