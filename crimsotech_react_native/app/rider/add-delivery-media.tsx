import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import AxiosInstance from "../../contexts/axios";

const COLORS = {
  primary: "#1F2937",
  secondary: "#111827",
  muted: "#6B7280",
  bg: "#FFFFFF",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
  success: "#10B981",
  info: "#3B82F6",
  warning: "#F59E0B",
};

type ProofItem = {
  id: string;
  file_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
  uploaded_at?: string | null;
  proof_type?: string | null;
};

type LocalProof = {
  uri: string;
  name: string;
  type: string;
};

export default function AddDeliveryMedia() {
  const router = useRouter();
  const { userId } = useAuth();
  const params = useLocalSearchParams();
  const deliveryId = params.deliveryId ? String(params.deliveryId) : "";

  const [existingProofs, setExistingProofs] = useState<ProofItem[]>([]);
  const [selectedProofs, setSelectedProofs] = useState<LocalProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const hasDeliveryId = Boolean(deliveryId);

  const isImageProof = (proof: ProofItem) => {
    const fileType = proof.file_type || "";
    const fileName = proof.file_name || "";
    if (fileType.toLowerCase().includes("image")) return true;
    return /\.(jpg|jpeg|png|gif|webp|bmp|heic|heif)$/i.test(fileName);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const selectedCount = useMemo(() => selectedProofs.length, [selectedProofs]);

  const fetchProofs = async () => {
    if (!userId || !deliveryId) return;
    try {
      setLoading(true);
      const response = await AxiosInstance.get("/proof-management/get_delivery_proofs/", {
        headers: { "X-User-Id": userId },
        params: { delivery_id: deliveryId },
      });
      if (response.data?.success) {
        const proofs = response.data.all_proofs || response.data.proofs || [];
        setExistingProofs(proofs);
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to load proofs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasDeliveryId) {
      fetchProofs();
    }
  }, [hasDeliveryId, userId, deliveryId]);

  const handlePickFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Gallery permission is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const assets = result.assets || [];
        const mapped = assets.map((asset, index) => ({
          uri: asset.uri,
          name: asset.fileName || `delivery_proof_${Date.now()}_${index}.jpg`,
          type: asset.mimeType || "image/jpeg",
        }));
        setSelectedProofs((prev) => [...prev, ...mapped]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select images");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera permission is required.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        setSelectedProofs((prev) => [
          ...prev,
          {
            uri: asset.uri,
            name: asset.fileName || `delivery_proof_${Date.now()}.jpg`,
            type: asset.mimeType || "image/jpeg",
          },
        ]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const removeSelectedProof = (index: number) => {
    setSelectedProofs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!userId || !deliveryId) {
      Alert.alert("Error", "Delivery ID is missing");
      return;
    }

    if (selectedProofs.length === 0) {
      Alert.alert("No Proofs", "Please add at least one proof photo.");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("delivery_id", deliveryId);
      formData.append("proof_type", "delivery");
      selectedProofs.forEach((proof) => {
        formData.append("proofs", proof as any);
      });

      const response = await AxiosInstance.post(
        "/proof-management/upload_proofs/",
        formData,
        {
          headers: {
            "X-User-Id": userId,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data?.success) {
        Alert.alert("Success", response.data.message || "Proofs uploaded successfully.");
        setSelectedProofs([]);
        fetchProofs();
      } else {
        Alert.alert("Upload Failed", response.data?.error || "Failed to upload proofs");
      }
    } catch (error: any) {
      Alert.alert("Upload Failed", error?.message || "Failed to upload proofs");
    } finally {
      setUploading(false);
    }
  };

  const openProof = async (url?: string | null) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Error", "Unable to open the file");
    }
  };

  if (!hasDeliveryId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Delivery ID is missing.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Proofs</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Existing Proofs</Text>
          <Text style={styles.sectionSubtitle}>
            Previously uploaded proof files for this delivery.
          </Text>

          {loading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : existingProofs.length === 0 ? (
            <Text style={styles.emptyText}>No proofs uploaded yet.</Text>
          ) : (
            <View style={styles.proofGrid}>
              {existingProofs.map((proof) => (
                <TouchableOpacity
                  key={proof.id}
                  style={styles.proofCard}
                  onPress={() => openProof(proof.file_url)}
                >
                  {isImageProof(proof) && proof.file_url ? (
                    <Image source={{ uri: proof.file_url }} style={styles.proofImage} />
                  ) : (
                    <View style={styles.fileIcon}>
                      <MaterialIcons name="insert-drive-file" size={24} color={COLORS.info} />
                    </View>
                  )}
                  <Text style={styles.proofName} numberOfLines={1}>
                    {proof.file_name || "Proof file"}
                  </Text>
                  <Text style={styles.proofMeta}>{formatDate(proof.uploaded_at)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Add New Proofs</Text>
          <Text style={styles.sectionSubtitle}>
            Capture or upload proof photos to attach to this delivery.
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionButton} onPress={handleTakePhoto}>
              <MaterialIcons name="photo-camera" size={20} color={COLORS.primary} />
              <Text style={styles.actionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handlePickFromLibrary}>
              <MaterialIcons name="photo-library" size={20} color={COLORS.primary} />
              <Text style={styles.actionText}>Choose Photos</Text>
            </TouchableOpacity>
          </View>

          {selectedProofs.length > 0 && (
            <View style={styles.selectedList}>
              {selectedProofs.map((proof, index) => (
                <View key={`${proof.uri}-${index}`} style={styles.selectedItem}>
                  <Image source={{ uri: proof.uri }} style={styles.selectedImage} />
                  <View style={styles.selectedInfo}>
                    <Text style={styles.selectedName} numberOfLines={1}>
                      {proof.name}
                    </Text>
                    <Text style={styles.selectedMeta}>Ready to upload</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeSelectedProof(index)}>
                    <MaterialIcons name="close" size={20} color={COLORS.muted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.uploadButton, uploading && { opacity: 0.6 }]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons name="cloud-upload" size={20} color="#FFFFFF" />
                <Text style={styles.uploadText}>Upload Proofs</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.summaryText}>{selectedCount} file(s) selected</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.cardBg,
  },
  backIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  sectionSubtitle: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 13,
  },
  proofGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 12,
  },
  proofCard: {
    width: "48%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 8,
  },
  proofImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileIcon: {
    height: 120,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  proofName: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  proofMeta: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F9FAFB",
  },
  actionText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  selectedList: {
    marginTop: 16,
    gap: 12,
  },
  selectedItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  selectedMeta: {
    fontSize: 11,
    color: COLORS.muted,
  },
  uploadButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  summaryText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "center",
  },
  emptyText: {
    marginTop: 12,
    color: COLORS.muted,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  errorText: {
    color: COLORS.muted,
    textAlign: "center",
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});
