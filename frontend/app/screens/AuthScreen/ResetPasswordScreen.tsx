import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import Toast from "react-native-toast-message";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../../types/auth";
import axiosInstance from "../../../utils/axiosHelper";

const baseURL = process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:5000";

type Nav   = StackNavigationProp<AuthStackParamList, "ResetPasswordScreen">;
type Route = RouteProp<AuthStackParamList, "ResetPasswordScreen">;

export default function ResetPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();

  const [token,       setToken]       = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPwd,  setConfirmPwd]  = useState("");
  const [loading,     setLoading]     = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = async () => {
    if (!token.trim()) {
      Toast.show({ type: "info", text1: "Enter the reset token from your email." });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Toast.show({ type: "info", text1: "Password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPwd) {
      Toast.show({ type: "error", text1: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post(`${baseURL}/api/v1/auth/reset-password`, {
        email:       params.email,
        token:       token.trim(),
        newPassword,
      });
      Toast.show({
        type:            "success",
        text1:           "Password reset",
        text2:           "Your password has been updated. Please log in.",
        visibilityTime:  4000,
      });
      navigation.navigate("LoginScreen");
    } catch (err: any) {
      Toast.show({
        type:  "error",
        text1: "Reset failed",
        text2: err.response?.data?.message || "Token may be invalid or expired.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Image source={require("../../../assets/Logo.png")} style={styles.logo} resizeMode="contain" />

      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Enter the reset token sent to{"\n"}
        <Text style={styles.email}>{params.email}</Text>
      </Text>

      {/* Token */}
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Reset token"
          placeholderTextColor="#9ca3af"
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* New password */}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, styles.inputFlex]}
          placeholder="New password"
          placeholderTextColor="#9ca3af"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showNew}
        />
        <TouchableOpacity onPress={() => setShowNew((v) => !v)} style={styles.eyeBtn}>
          <Text style={styles.eyeText}>{showNew ? "Hide" : "Show"}</Text>
        </TouchableOpacity>
      </View>

      {/* Confirm password */}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, styles.inputFlex]}
          placeholder="Confirm new password"
          placeholderTextColor="#9ca3af"
          value={confirmPwd}
          onChangeText={setConfirmPwd}
          secureTextEntry={!showConfirm}
        />
        <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} style={styles.eyeBtn}>
          <Text style={styles.eyeText}>{showConfirm ? "Hide" : "Show"}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleReset}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Set New Password</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("LoginScreen")} style={styles.backLink}>
        <Text style={styles.backText}>← Back to Login</Text>
      </TouchableOpacity>

      <View style={styles.hint}>
        <Text style={styles.hintText}>
          Can't find the token? Check your spam folder. In development mode the token is logged to the server console.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logo:       { width: 100, height: 100, marginBottom: 16 },
  title:      { fontSize: 26, fontWeight: "800", color: "#0F172A", marginBottom: 6, textAlign: "center" },
  subtitle:   { fontSize: 14, color: "#475569", marginBottom: 28, textAlign: "center", lineHeight: 22 },
  email:      { fontWeight: "700", color: "#0EA5A4" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#fff",
    marginBottom: 16,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: "#000",
  },
  inputFlex:  {},
  eyeBtn:     { paddingHorizontal: 4 },
  eyeText:    { color: "#0EA5A4", fontWeight: "600", fontSize: 13 },
  button: {
    width: "100%",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    backgroundColor: "#0EA5A4",
    marginTop: 6,
  },
  buttonDisabled: { backgroundColor: "#9ca3af" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  backLink:   { marginTop: 18 },
  backText:   { color: "#64748B", fontWeight: "500", fontSize: 14 },
  hint: {
    marginTop: 28,
    backgroundColor: "#e0f2fe",
    borderRadius: 10,
    padding: 14,
    width: "100%",
  },
  hintText:   { fontSize: 12, color: "#0369a1", lineHeight: 18, textAlign: "center" },
});
