import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

interface EditedData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface EditModalProps {
  isVisible: boolean;
  user: any;
  onClose: () => void;
  onSave: (editedData: EditedData, newImageUri: string | null) => Promise<void>;
  currentImageUrl: string | null;
}

export default function EditProfileModal({
  isVisible,
  user,
  onClose,
  onSave,
  currentImageUrl,
}: EditModalProps) {
  const [editedUser, setEditedUser] = useState<EditedData>({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });

  // newLocalImage holds ONLY a local file URI chosen by the user this session.
  // It starts null — meaning "no new image selected; keep the existing one".
  // We never put the remote Cloudinary URL in here, which prevents accidentally
  // treating a remote URL as a local file path in the FormData upload.
  const [newLocalImage, setNewLocalImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reset state each time the modal opens so stale values never carry over.
  useEffect(() => {
    if (isVisible) {
      setEditedUser({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
        phone: user?.phone || "",
      });
      setNewLocalImage(null);
    }
  }, [isVisible, user]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setNewLocalImage(result.assets[0].uri);
    }
  };

  const handleSavePress = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Pass newLocalImage (null = no change, local URI = new file to upload).
      // UserProfile.tsx only appends to FormData when this is non-null.
      await onSave(editedUser, newLocalImage);
      onClose();
    } catch {
      // Error alert handled in UserProfile.tsx
    } finally {
      setIsSaving(false);
    }
  };

  // Show newly picked local image first; fall back to the existing Cloudinary URL.
  const displayUri = newLocalImage ?? currentImageUrl;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} disabled={isSaving}>
              <MaterialIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
              {displayUri ? (
                <Image source={{ uri: displayUri }} style={styles.avatarImage} />
              ) : (
                <MaterialIcons name="person" size={60} color="#2563eb" />
              )}
              <Text style={styles.changeText}>
                {newLocalImage ? "Photo selected ✓" : "Change Photo"}
              </Text>
            </TouchableOpacity>

            {(
              [
                { label: "First Name",  key: "firstName",  keyboardType: "default"       },
                { label: "Last Name",   key: "lastName",   keyboardType: "default"       },
                { label: "Email",       key: "email",      keyboardType: "email-address" },
                { label: "Phone",       key: "phone",      keyboardType: "phone-pad"     },
              ] as const
            ).map(({ label, key, keyboardType }) => (
              <View style={styles.inputGroup} key={key}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={editedUser[key]}
                  onChangeText={(text) =>
                    setEditedUser((prev) => ({ ...prev, [key]: text }))
                  }
                  keyboardType={keyboardType as any}
                  autoCapitalize={key === "email" ? "none" : "words"}
                  editable={!isSaving}
                />
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.button, isSaving && styles.buttonDisabled]}
            onPress={handleSavePress}
            disabled={isSaving}
          >
            <Text style={styles.buttonText}>
              {isSaving ? "Saving…" : "Save Changes"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#1f2937" },
  scrollContent: { paddingBottom: 20 },
  avatarContainer: { alignItems: "center", marginVertical: 10 },
  avatarImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 8 },
  changeText: { color: "#2563eb", fontSize: 14, fontWeight: "600" },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: "#1f2937",
  },
  button: {
    backgroundColor: "#16a34a",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: { backgroundColor: "#9ca3af" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
