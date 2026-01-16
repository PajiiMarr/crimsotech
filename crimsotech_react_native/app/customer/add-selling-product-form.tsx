import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Image,
  Dimensions,
  Alert,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get("window");

// --- CONSTANTS ---
const CONDITION_OPTIONS = [
  "New",
  "Like New",
  "Refurbished",
  "Used - Excellent",
  "Used - Good",
];

export default function AddSellingProductForm() {
  // --- Form State ---
  const [formData, setFormData] = useState({
    name: "",
    condition: "",
    description: "",
    // Global Price/Qty (used if variations disabled)
    price: "",
    comparePrice: "",
    quantity: "",
    // Specs
    length: "",
    width: "",
    height: "",
    weight: "",
    weightUnit: "g",
    // Toggles
    lowStockAlert: false,
    criticalThreshold: "",
    enableVariations: false,
    openForSwap: false,
  });

  // Media State
  const [images, setImages] = useState<string[]>([]); // Array of image URIs

  // Variation State
  const [variantOption, setVariantOption] = useState("Color"); // e.g. "Color"
  const [variantInput, setVariantInput] = useState(""); // Text input for new variant
  const [variants, setVariants] = useState<any[]>([]); // The generated list: [{ name: 'Red', price: '', qty: '', sku: '' }]

  // UI State
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // --- Handlers ---
  const updateField = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleBack = () => router.back();

  const handleImagePick = async () => {
    if (images.length >= 9) {
      Alert.alert("Limit Reached", "You can only upload up to 9 images.");
      return;
    }

    // Calculate how many more images can be selected
    const remainingSlots = 9 - images.length;

    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Required", "Please grant permission to access photos.");
      return;
    }

    setUploading(true);
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Changed to false for multi-select
        allowsMultipleSelection: true, // Enable multi-select
        selectionLimit: remainingSlots, // Limit to remaining slots
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
        orderedSelection: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImages = result.assets;
        
        // Add all selected images to the images array
        const newImageUris = selectedImages.map(asset => asset.uri);
        
        // Check if adding these would exceed the limit
        if (images.length + newImageUris.length > 9) {
          Alert.alert(
            "Too Many Images", 
            `You can only select up to ${remainingSlots} more images.`
          );
          // Add only up to the limit
          const imagesToAdd = newImageUris.slice(0, remainingSlots);
          setImages([...images, ...imagesToAdd]);
        } else {
          setImages([...images, ...newImageUris]);
        }
        
        console.log('Selected images:', selectedImages.length);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert("Error", "Failed to pick images. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Optional: Add camera functionality
  const handleTakePhoto = async () => {
    if (images.length >= 9) {
      Alert.alert("Limit Reached", "You can only upload up to 9 images.");
      return;
    }

    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Required", "Please grant permission to access camera.");
      return;
    }

    setUploading(true);
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const takenPhoto = result.assets[0];
        setImages([...images, takenPhoto.uri]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Show image source options
  const showImageSourceOptions = () => {
    const remainingSlots = 9 - images.length;
    
    Alert.alert(
      "Add Images",
      `You can select up to ${remainingSlots} more images. Choose source:`,
      [
        { 
          text: "Camera (1 photo)", 
          onPress: handleTakePhoto 
        },
        { 
          text: `Gallery (${remainingSlots} max)`, 
          onPress: handleImagePick 
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const removeImage = (index: number) => {
    Alert.alert(
      "Remove Image",
      "Are you sure you want to remove this image?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: () => {
            setImages(images.filter((_, i) => i !== index));
          }
        }
      ]
    );
  };

  const addVariant = () => {
    if (!variantInput.trim()) return;
    // Add new variant to the list
    const newVariant = {
      id: Date.now().toString(),
      name: variantInput.trim(),
      price: "",
      quantity: "",
      sku: "",
      image: null,
    };
    setVariants([...variants, newVariant]);
    setVariantInput("");
  };

  const updateVariantField = (id: string, field: string, value: string) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const removeVariant = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const handleSubmit = () => {
    console.log("Form Data:", formData);
    console.log("Images:", images);
    console.log("Variants:", variants);
    
    // Validate required fields
    if (!formData.name.trim()) {
      Alert.alert("Error", "Please enter product name");
      return;
    }
    
    if (!formData.condition) {
      Alert.alert("Error", "Please select product condition");
      return;
    }
    
    if (images.length === 0) {
      Alert.alert("Error", "Please add at least one product image");
      return;
    }
    
    // Validate critical threshold if low stock alert is enabled
    if (formData.lowStockAlert && !formData.criticalThreshold) {
      Alert.alert("Error", "Please set critical threshold for low stock alert");
      return;
    }
    
    Alert.alert("Success", "Product created successfully!");
  };

  // --- RENDER HELPERS ---
  const renderConditionModal = () => (
    <Modal visible={showConditionModal} transparent animationType="fade">
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowConditionModal(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Condition</Text>
          {CONDITION_OPTIONS.map((item) => (
            <TouchableOpacity
              key={item}
              style={styles.modalOption}
              onPress={() => {
                updateField("condition", item);
                setShowConditionModal(false);
              }}
            >
              <Text
                style={[
                  styles.modalOptionText,
                  formData.condition === item && styles.selectedOptionText,
                ]}
              >
                {item}
              </Text>
              {formData.condition === item && (
                <Ionicons name="checkmark" size={20} color="#FF6B00" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Product</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: AI Category Prediction */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="auto-awesome" size={18} color="#8B5CF6" />
            <Text style={styles.cardTitle}>Step 1: AI Category Prediction</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Fill in basic details. Our AI will suggest the best category.
          </Text>

          {/* Product Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Product Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter product name"
              value={formData.name}
              onChangeText={(t) => updateField("name", t)}
            />
          </View>

          <View style={styles.row}>
            {/* Condition Dropdown */}
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>
                Condition <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dropdownInput}
                onPress={() => setShowConditionModal(true)}
              >
                <Text
                  style={{
                    color: formData.condition ? "#000" : "#9CA3AF",
                    fontSize: 13,
                  }}
                  numberOfLines={1}
                >
                  {formData.condition || "Select"}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Quantity (Moved to Step 1 per request) */}
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>
                Quantity <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={formData.quantity}
                onChangeText={(t) => updateField("quantity", t)}
                // Disable if using variations? Usually global qty is ignored if variations exist
                editable={!formData.enableVariations}
                placeholderTextColor={
                  formData.enableVariations ? "#CCC" : "#999"
                }
              />
            </View>
          </View>
          {formData.enableVariations && (
            <Text style={styles.infoText}>
              * Quantity is managed per variant below.
            </Text>
          )}

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Description <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter detailed product description"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={formData.description}
              onChangeText={(t) => updateField("description", t)}
            />
          </View>

          <TouchableOpacity style={styles.aiButton}>
            <MaterialIcons name="auto-awesome" size={16} color="#4B5563" />
            <Text style={styles.aiButtonText}>Get AI Category Suggestion</Text>
          </TouchableOpacity>
        </View>

        {/* Step 2: Product Media */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Step 2: Product Media</Text>
            <View style={styles.counterContainer}>
              <Text style={styles.counterText}>{images.length}/9</Text>
              {images.length < 9 && (
                <Text style={styles.remainingText}>
                  {9 - images.length} remaining
                </Text>
              )}
            </View>
          </View>
          <Text style={styles.cardSubtitle}>
            Upload main product images. You can select multiple at once from gallery.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imageScroll}
            contentContainerStyle={styles.imageScrollContent}
          >
            {/* Add Image Button */}
            <TouchableOpacity
              style={[
                styles.addPictureBox,
                (uploading || images.length >= 9) && styles.disabledButton
              ]}
              onPress={showImageSourceOptions}
              disabled={uploading || images.length >= 9}
            >
              {uploading ? (
                <>
                  <Ionicons name="cloud-upload-outline" size={28} color="#6B7280" />
                  <Text style={styles.addPictureText}>Uploading...</Text>
                </>
              ) : images.length >= 9 ? (
                <>
                  <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                  <Text style={styles.addPictureText}>Max Reached</Text>
                </>
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={32} color="#FF6B00" />
                  <Text style={styles.addPictureText}>Add Images</Text>
                  <Text style={styles.slotText}>
                    {9 - images.length} slot{9 - images.length !== 1 ? 's' : ''} left
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Selected Images */}
            {images.map((uri, index) => (
              <View key={index} style={styles.imagePreviewWrapper}>
                <Image 
                  source={{ uri }} 
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <View style={styles.imageNumberBadge}>
                  <Text style={styles.imageNumberText}>{index + 1}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close" size={14} color="#FFF" />
                </TouchableOpacity>
                {index === 0 && (
                  <View style={styles.coverBadge}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

         
          
          {/* Selected images info */}
          {images.length > 0 && images.length < 9 && (
            <View style={styles.uploadInfo}>
              <Text style={styles.uploadInfoText}>
                You can add {9 - images.length} more image{9 - images.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Step 3: Variations */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Step 3: Variations (Optional)</Text>
            <Switch
              trackColor={{ false: "#E5E7EB", true: "#FF6B00" }}
              thumbColor={"#FFF"}
              value={formData.enableVariations}
              onValueChange={(v) => updateField("enableVariations", v)}
            />
          </View>
          <Text style={styles.cardSubtitle}>
            Enable this to add variant groups (e.g. Size, Color).
          </Text>

          {formData.enableVariations && (
            <View style={styles.variationSection}>
              {/* Option Generator */}
              <View style={styles.variantGenerator}>
                <Text style={styles.label}>Option Name</Text>
                <TextInput
                  style={[styles.input, { marginBottom: 10 }]}
                  value={variantOption}
                  onChangeText={setVariantOption}
                  placeholder="e.g. Color"
                />

                <Text style={styles.label}>Add Option Value</Text>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                    value={variantInput}
                    onChangeText={setVariantInput}
                    placeholder="e.g. Red, Blue..."
                    onSubmitEditing={addVariant}
                  />
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={addVariant}
                  >
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Generated Combinations List */}
              {variants.length > 0 && (
                <View style={{ marginTop: 15 }}>
                  <Text style={styles.label}>Generated Combinations</Text>
                  {variants.map((variant) => (
                    <View key={variant.id} style={styles.variantCard}>
                      <View style={styles.variantHeader}>
                        <View style={styles.variantBadge}>
                          <Text style={styles.variantName}>{variant.name}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => removeVariant(variant.id)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#EF4444"
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.smallLabel}>Price</Text>
                          <TextInput
                            style={styles.smallInput}
                            placeholder="0.00"
                            keyboardType="numeric"
                            value={variant.price}
                            onChangeText={(t) =>
                              updateVariantField(variant.id, "price", t)
                            }
                          />
                        </View>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.smallLabel}>Qty</Text>
                          <TextInput
                            style={styles.smallInput}
                            placeholder="0"
                            keyboardType="numeric"
                            value={variant.quantity}
                            onChangeText={(t) =>
                              updateVariantField(variant.id, "quantity", t)
                            }
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.smallLabel}>SKU</Text>
                          <TextInput
                            style={styles.smallInput}
                            placeholder="Optional"
                            value={variant.sku}
                            onChangeText={(t) =>
                              updateVariantField(variant.id, "sku", t)
                            }
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Global Dimensions (Always shown per image, even if logic suggests otherwise sometimes) */}
          <Text style={[styles.label, { marginTop: 15 }]}>
            Package Dimensions & Weight
          </Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              placeholder="L (cm)"
              keyboardType="numeric"
              onChangeText={(t) => updateField("length", t)}
            />
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              placeholder="W (cm)"
              keyboardType="numeric"
              onChangeText={(t) => updateField("width", t)}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="H (cm)"
              keyboardType="numeric"
              onChangeText={(t) => updateField("height", t)}
            />
          </View>
          <View style={[styles.row, { marginTop: 8 }]}>
            <TextInput
              style={[styles.input, { flex: 2, marginRight: 8 }]}
              placeholder="Weight"
              keyboardType="numeric"
              onChangeText={(t) => updateField("weight", t)}
            />
            <View style={[styles.unitBox, { flex: 1 }]}>
              <Text>g</Text>
            </View>
          </View>
        </View>

        {/* Step 4: Pricing & Stock (CONDITIONAL) */}
        {/* Only show this if Variations are DISABLED */}
        {!formData.enableVariations && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Step 4: Pricing</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>
                  Price <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={formData.price}
                  onChangeText={(t) => updateField("price", t)}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Compare Price</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={formData.comparePrice}
                  onChangeText={(t) => updateField("comparePrice", t)}
                />
                <Text style={styles.helperText}>Original price</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Low Stock Alert with Threshold */}
            <View style={styles.lowStockSection}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.label}>Critical Stock Alert</Text>
                  <Text style={styles.helperText}>
                    Receive notification when stock is low
                  </Text>
                </View>
                <Switch
                  trackColor={{ false: "#E5E7EB", true: "#FF6B00" }}
                  thumbColor={"#FFF"}
                  value={formData.lowStockAlert}
                  onValueChange={(v) => updateField("lowStockAlert", v)}
                />
              </View>

              {/* Critical Threshold Input - Only show when lowStockAlert is ON */}
              {formData.lowStockAlert && (
                <View style={[styles.inputGroup, { marginTop: 16 }]}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.label}>Critical Threshold</Text>
                    <Text style={styles.unitLabel}>units</Text>
                  </View>
                  <View style={styles.thresholdContainer}>
                    <TextInput
                      style={styles.thresholdInput}
                      placeholder="e.g., 5"
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                      value={formData.criticalThreshold || ""}
                      onChangeText={(t) => updateField("criticalThreshold", t)}
                    />
                    <View style={styles.thresholdHelper}>
                      <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
                      <Text style={styles.thresholdHelperText}>
                        Alert when stock reaches this level
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Step 5: Swap Options */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.cardTitle}>Step 5: Swap Options</Text>
              <Text style={styles.cardSubtitle}>
                Allow others to offer items in exchange.
              </Text>
            </View>
            <Switch
              trackColor={{ false: "#E5E7EB", true: "#FF6B00" }}
              thumbColor={"#FFF"}
              value={formData.openForSwap}
              onValueChange={(v) => updateField("openForSwap", v)}
            />
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Create Product</Text>
        </TouchableOpacity>
      </View>

      {renderConditionModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  content: { padding: 16 },

  // Card
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginLeft: 6,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 16,
    marginTop: 2,
  },
  counterContainer: {
    alignItems: 'flex-end',
  },
  counterText: {
    fontSize: 12,
    color: "#9CA3AF",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  remainingText: {
    fontSize: 10,
    color: '#10B981',
    marginTop: 2,
  },

  // Inputs
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6 },
  required: { color: "#EF4444" },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111",
    backgroundColor: "#FFF",
  },
  smallInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    backgroundColor: "#F9FAFB",
  },
  smallLabel: { fontSize: 11, color: "#6B7280", marginBottom: 4 },
  textArea: { height: 100, textAlignVertical: "top" },
  dropdownInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  helperText: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },
  infoText: {
    fontSize: 11,
    color: "#F59E0B",
    marginTop: -10,
    marginBottom: 16,
    fontStyle: "italic",
  },

  // Media
  imageScroll: { flexDirection: "row", marginTop: 4 },
  imageScrollContent: { paddingRight: 16 },
  addPictureBox: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    backgroundColor: "#F9FAFB",
  },
  addPictureText: { 
    fontSize: 12, 
    color: "#6B7280", 
    marginTop: 6,
    fontWeight: "500",
  },
  slotText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  imagePreviewWrapper: { 
    marginRight: 12, 
    position: "relative" 
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#EEE",
  },
  removeImageBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  imageNumberBadge: {
    position: 'absolute',
    top: -8,
    left: -8,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  imageNumberText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  coverBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 4,
    alignItems: "center",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  coverBadgeText: { 
    color: "#FFF", 
    fontSize: 10, 
    fontWeight: "700" 
  },
  uploadTips: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
  uploadTipHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  uploadTipText: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  uploadInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  uploadInfoText: {
    fontSize: 11,
    color: '#065F46',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Variants
  variationSection: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  variantGenerator: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  addButton: {
    backgroundColor: "#FF6B00",
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 8,
    height: 40,
  },
  addButtonText: { color: "#FFF", fontWeight: "600" },
  variantCard: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  variantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  variantBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  variantName: { color: "#2563EB", fontSize: 13, fontWeight: "600" },

  // Specialized
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    marginTop: 4,
  },
  aiButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
    marginLeft: 6,
  },
  row: { flexDirection: "row", alignItems: "center" },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  unitBox: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 12 },

  // Low Stock Alert Styles
  lowStockSection: {
    marginTop: 8,
  },
  unitLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  thresholdContainer: {
    marginTop: 8,
  },
  thresholdInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111",
    backgroundColor: "#FFF",
    width: "100%",
  },
  thresholdHelper: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    padding: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
  },
  thresholdHelperText: {
    fontSize: 11,
    color: "#6B7280",
    marginLeft: 6,
    flex: 1,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width * 0.8,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 15,
    textAlign: "center",
  },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalOptionText: { fontSize: 16, color: "#333" },
  selectedOptionText: { color: "#FF6B00", fontWeight: "700" },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    elevation: 10,
  },
  submitButton: {
    backgroundColor: "#FF6B00",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});