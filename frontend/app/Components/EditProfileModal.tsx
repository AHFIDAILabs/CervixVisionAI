// components/EditProfileModal.tsx (Create this new file)

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
  Alert,
  KeyboardAvoidingView, // <-- Added KeyboardAvoidingView for better UX
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

// Props expected by the modal
interface EditModalProps {
  isVisible: boolean;
  user: any; // Use your actual User type here
  onClose: () => void;
  // Use the defined EditedData interface for type safety
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
  
  // FIX 1: Explicitly define EditedData type for state
  const [editedUser, setEditedUser] = useState<EditedData>({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  
  // FIX 2: Initialize localImage state with the prop
  const [localImage, setLocalImage] = useState<string | null>(currentImageUrl);
  const [isSaving, setIsSaving] = useState(false);

  // FIX 3: Add a separate useEffect to handle synchronization
  // This hook ensures that when the modal becomes visible OR the committed image changes, 
  // we reset the state to match the parent's props.
  useEffect(() => {
      // Only run this when the modal becomes visible or the committed image changes
      setEditedUser({
          firstName: user?.firstName || "",
          lastName: user?.lastName || "",
          email: user?.email || "",
          phone: user?.phone || "",
      });
      setLocalImage(currentImageUrl);
  }, [user, currentImageUrl, isVisible]); // Dependency array is correct


  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setLocalImage(result.assets[0].uri);
    }
  };

  const handleSavePress = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Pass the edited text data and the local image state (which holds the new URI)
      await onSave(editedUser, localImage);
      onClose(); // Close modal on success
    } catch (error) {
      // Error alert is handled in UserProfile.tsx
    } finally {
      setIsSaving(false);
    }
  };

  const imageSource = localImage ? { uri: localImage } : undefined;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
        
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} disabled={isSaving}>
              <MaterialIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={modalStyles.scrollContent}>
          
            <TouchableOpacity onPress={pickImage} style={modalStyles.avatarContainer}>
              {imageSource ? (
                <Image source={imageSource} style={modalStyles.avatarImage} />
              ) : (
                <MaterialIcons name="person" size={60} color="#2563eb" />
              )}
              <Text style={modalStyles.changeText}>Change Photo</Text>
            </TouchableOpacity>

          
            {[
              { label: "First Name", key: "firstName", keyboardType: "default" },
              { label: "Last Name", key: "lastName", keyboardType: "default" },
              { label: "Email", key: "email", keyboardType: "email-address" },
              { label: "Phone", key: "phone", keyboardType: "phone-pad" },
            ].map(({ label, key, keyboardType }) => (
              <View style={modalStyles.inputGroup} key={key}>
                <Text style={modalStyles.label}>{label}</Text>
                <TextInput
                  style={modalStyles.input}
                  // FIX 1: Explicitly cast 'key' to a known property of EditedData for safe access
                  value={editedUser[key as keyof EditedData]}
                  onChangeText={(text) =>
                    // FIX 2: Explicitly cast 'key' for safe object spread
                    setEditedUser({ ...editedUser, [key as keyof EditedData]: text })
                  }
                  keyboardType={keyboardType as any}
                  editable={!isSaving}
                />
              </View>
            ))}
          </ScrollView>

         
          <TouchableOpacity
            style={[modalStyles.button, modalStyles.saveButton]}
            onPress={handleSavePress}
            disabled={isSaving}
          >
            <Text style={modalStyles.buttonText}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "flex-end", // Align modal to the bottom
    backgroundColor: "rgba(0,0,0,0.5)", // Semi-transparent background
  },
  modalView: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: "90%", // Limit height
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
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  saveButton: { backgroundColor: "#16a34a" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});