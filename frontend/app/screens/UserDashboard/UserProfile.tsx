// screens/UserProfileScreen.tsx (Your main UserProfile file)

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../../../Context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { getProfile, editProfile } from "../../../Services/userService";
import * as SecureStore from "expo-secure-store";
import EditProfileModal from "../../Components/EditProfileModal"; // <-- Import the new modal
import BottomNavigationBar from "../../Components/BottomBar";
import { AppStackParamList } from "../../../types/AppStack";
import DashboardLayout from "./DashboardLayout";


type ProfileNav = StackNavigationProp<AppStackParamList, "UserProfileScreen">;

export default function UserProfile() {
  const { user, setUser, accessToken, setAccessToken, logout } = useAuth();
  const navigation = useNavigation<ProfileNav>();

  // State to control modal visibility
  const [modalVisible, setModalVisible] = useState(false);

  // State for image display (uses user?.userImage which is now string/null from backend fix)
 const [image, setImage] = useState<string | null>(user?.userImage || null);

  // Sync local image state when user changes in context
  useEffect(() => {
    setImage((user?.userImage as string | null) || null);
  }, [user]);

  // Fetch profile from backend (Keep this to refresh on mount)
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getProfile();
        // Since we fixed the backend, response.user.userImage should be string or null
        setUser(response.user);
      } catch (error) {
        console.error("Profile Fetch Error:", error);
      }
    };
    fetchProfile();
  }, []);

  // Combined save handler that is passed to the modal
  const handleSave = async (
    editedData: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    },
    newImageUri: string | null
  ) => {
    const formData = new FormData();
    
    formData.append("firstName", editedData.firstName);
    formData.append("lastName", editedData.lastName);
    formData.append("email", editedData.email);
    formData.append("phone", editedData.phone);

    // Get the current URL from the context user object
    const currentProfileImageUrl = (user?.userImage as string | null) || null;
console.log("Image URI being sent:", newImageUri);
    // Only send new image if user picked a new one (i.e., newImageUri is a local URI)
    if (newImageUri && newImageUri !== currentProfileImageUrl) {
      const file = {
        uri: newImageUri, // The local file URI from ImagePicker
        type: "image/jpeg",
        name: `profile_${user?.id}.jpg`,
      };
      formData.append("userImage", file as any);
    }
    
    try {
      const response = await editProfile(formData);
      
      // Update tokens and user state
      if (response.accessToken) {
        setAccessToken(response.accessToken);
        await SecureStore.setItemAsync("accessToken", response.accessToken);
      }
      if (response.refreshToken) {
        await SecureStore.setItemAsync("refreshToken", response.refreshToken);
      }
      
      setUser(response.user); // Update global state with the response
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      // Error logging and alert remain here
      console.error("Profile Update Error:", error);
      Alert.alert("Error", "Failed to update profile.");
      throw error; // Re-throw to inform the modal to stop loading
    }
  };


  return (
    <DashboardLayout >
    
    <ScrollView contentContainerStyle={styles.scrollContent}>
  
      <View style={styles.header}>
        <Text style={styles.headerText}>Profile</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="close" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      
      <View style={styles.profileCard}>
    
        <View style={styles.avatarContainer}>
          {image ? (
            <Image source={{ uri: image }} style={styles.avatarImage} />
          ) : (
            <MaterialIcons name="person" size={60} color="#2563eb" />
          )}
        </View>

        
        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.role}>
          {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Patient"}
        </Text>

       
        {[
          { label: "First Name", value: user?.firstName },
          { label: "Last Name", value: user?.lastName },
          { label: "Email", value: user?.email },
          { label: "Phone", value: user?.phone },
        ].map((item, index) => (
          <View style={styles.inputGroup} key={index}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.displayValue}>{item.value || "N/A"}</Text>
          </View>
        ))}

       
        <TouchableOpacity
          style={styles.button}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>

     
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <MaterialIcons name="logout" size={24} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
     
      <EditProfileModal
        isVisible={modalVisible}
        user={user}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        currentImageUrl={image}
      />
    </ScrollView>
   <BottomNavigationBar active="profile" /> 
    </DashboardLayout>
    
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, backgroundColor: "#f3f4f6" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerText: { fontSize: 24, fontWeight: "bold", color: "#1f2937" },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 3,
  },
  avatarContainer: { alignItems: "center", marginBottom: 16 },
  avatarImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 8 },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 16,
  },
  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  displayValue: { // New style for read-only display
    fontSize: 16,
    color: "#1f2937",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 20,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },
});