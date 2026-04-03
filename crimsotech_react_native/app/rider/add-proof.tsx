import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Modal,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import AxiosInstance from "../../contexts/axios";

const { width } = Dimensions.get("window");

const COLORS = {
  primary: "#1F2937",
  secondary: "#111827",
  muted: "#6B7280",
  bg: "#F9FAFB",
  border: "#E5E7EB",
  success: "#10B981",
  info: "#3B82F6",
  danger: "#DC2626",
};

const MAX_IMAGES = 8;

export default function AddProofPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const params = useLocalSearchParams();
  const deliveryId = params.deliveryId ? String(params.deliveryId) : "";

  const [existingProofs, setExistingProofs] = useState<any[]>([]);
  const [capturedImages, setCapturedImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchProofs();
  }, [deliveryId]);

  const fetchProofs = async () => {
    try {
      const res = await AxiosInstance.get(
        `/rider-proof/delivery/${deliveryId}/proofs/`,
        { headers: { "X-User-Id": userId } }
      );
      if (res.data.success) setExistingProofs(res.data.proofs);
    } catch (error) {
      console.error("Error loading proofs:", error);
      Alert.alert("Error", "Failed to load existing proofs");
    } finally {
      setLoading(false);
    }
  };

  const handleTakePicture = async () => {
    if (capturedImages.length >= MAX_IMAGES) {
      Alert.alert("Limit Reached", `Maximum ${MAX_IMAGES} photos allowed`);
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Camera access is required to take photos");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ 
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled) {
      setCapturedImages([...capturedImages, result.assets[0]]);
    }
  };

  const openPreview = (uri: string) => {
    setSelectedImage(uri);
    setPreviewVisible(true);
  };

  const removeCapturedImage = (index: number) => {
    setCapturedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload a single image to the backend
  const uploadSingleImage = async (image: any): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append("proof_type", "delivery");
      formData.append("file", {
        uri: image.uri,
        type: image.mimeType || "image/jpeg",
        name: image.fileName || `proof_${Date.now()}.jpg`,
      } as any);

      await AxiosInstance.post(
        `/rider-proof/upload/${deliveryId}/`,
        formData,
        {
          headers: {
            "X-User-Id": userId,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return true;
    } catch (error) {
      console.error("Error uploading image:", error);
      return false;
    }
  };

  const handleConfirmDelivery = async () => {
    if (!capturedImages.length && !existingProofs.length) {
      Alert.alert("No Proof", "Please take at least one proof photo first");
      return;
    }

    setConfirming(true);
    try {
      // Upload each captured image one by one
      if (capturedImages.length > 0) {
        setUploading(true);
        let allUploaded = true;
        
        for (const image of capturedImages) {
          const success = await uploadSingleImage(image);
          if (!success) {
            allUploaded = false;
            break;
          }
        }
        
        setUploading(false);
        
        if (!allUploaded) {
          Alert.alert("Upload Failed", "Some photos failed to upload. Please try again.");
          setConfirming(false);
          return;
        }
      }

      // Then mark as delivered
      await AxiosInstance.post(
        "/rider-orders-active/deliver_order/",
        { delivery_id: deliveryId },
        { headers: { "X-User-Id": userId } }
      );

      Alert.alert("Success", "Order marked as delivered successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error("Error confirming delivery:", error);
      Alert.alert("Error", error?.response?.data?.error || "Failed to confirm delivery");
    } finally {
      setConfirming(false);
    }
  };

  const hasProofs = existingProofs.length > 0 || capturedImages.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={22} onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Proof of Delivery</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView>
        {/* CAMERA (TOP) */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.cameraBox} onPress={handleTakePicture}>
            <MaterialIcons name="photo-camera" size={32} color={COLORS.info} />
            <Text style={styles.cameraText}>Take Photo</Text>
            <Text style={styles.cameraSub}>
              {capturedImages.length}/{MAX_IMAGES} photos
            </Text>
          </TouchableOpacity>
        </View>

        {/* NEW PHOTOS */}
        {capturedImages.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.title}>Captured Photos</Text>
            <View style={styles.grid}>
              {capturedImages.map((img, i) => (
                <TouchableOpacity key={i} onPress={() => openPreview(img.uri)}>
                  <Image source={{ uri: img.uri }} style={styles.imgSmall} />
                  <Ionicons
                    name="close-circle"
                    size={18}
                    style={styles.remove}
                    onPress={() => removeCapturedImage(i)}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* EXISTING */}
        {existingProofs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.title}>Uploaded Photos</Text>
            <View style={styles.grid}>
              {existingProofs.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => openPreview(p.file_url)}
                >
                  <Image source={{ uri: p.file_url }} style={styles.imgSmall} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {loading && <ActivityIndicator style={{ marginTop: 40 }} />}
        
        {/* Uploading indicator */}
        {uploading && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color={COLORS.info} />
            <Text style={styles.uploadingText}>Uploading photos...</Text>
          </View>
        )}
      </ScrollView>

      {/* FOOTER - Button disabled until proof added */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, (!hasProofs || confirming || uploading) && styles.buttonDisabled]}
          onPress={handleConfirmDelivery}
          disabled={!hasProofs || confirming || uploading}
        >
          {confirming || uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Confirm Delivery</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* IMAGE PREVIEW MODAL */}
      <Modal visible={previewVisible} transparent>
        <View style={styles.modal}>
          <TouchableOpacity
            style={styles.close}
            onPress={() => setPreviewVisible(false)}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>

          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.previewImg} />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
  },

  headerTitle: { fontWeight: "600" },

  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },

  title: {
    fontWeight: "600",
    marginBottom: 10,
  },

  cameraBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
    borderRadius: 12,
  },

  cameraText: {
    fontWeight: "600",
    marginTop: 6,
  },

  cameraSub: {
    fontSize: 12,
    color: COLORS.muted,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  imgSmall: {
    width: (width - 64) / 4,
    height: (width - 64) / 4,
    borderRadius: 8,
  },

  remove: {
    position: "absolute",
    top: 2,
    right: 2,
    color: "red",
  },

  footer: {
    padding: 16,
    backgroundColor: "#fff",
  },

  button: {
    backgroundColor: COLORS.success,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonDisabled: {
    backgroundColor: "#D1D5DB",
    opacity: 0.7,
  },

  btnText: {
    color: "#fff",
    fontWeight: "600",
  },

  modal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },

  previewImg: {
    width: "90%",
    height: "70%",
    resizeMode: "contain",
  },

  close: {
    position: "absolute",
    top: 50,
    right: 20,
  },

  uploadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },

  uploadingText: {
    fontSize: 13,
    color: COLORS.muted,
  },
});