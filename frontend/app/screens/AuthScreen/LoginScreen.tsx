import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Modal,
  Image,
} from "react-native";
import Toast from "react-native-toast-message";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useAuth } from "../../../Context/AuthContext";
import { loginUser } from "../../../Services/authService";
import { AuthResponse } from "../../../types/auth";
import axiosInstance from "../../../utils/axiosHelper";

const baseURL = process.env.EXPO_PUBLIC_SERVER_URL || "http://localhost:5000";

type AuthStackParamList = {
  Home: undefined;
  LoginScreen: undefined;
  RegisterScreen: undefined;
};
type AuthNav = StackNavigationProp<AuthStackParamList, "LoginScreen">;

export default function LoginScreen() {
  const { handleSuccessfulAuth } = useAuth();
  const navigation = useNavigation<AuthNav>();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotEmail, setForgotEmail]     = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      triggerShake();
      Toast.show({ type: "info", text1: "Hold up!", text2: "Email and password can't be empty." });
      return;
    }
    try {
      setLoading(true);
      const res: AuthResponse = await loginUser({ email, password });
      await handleSuccessfulAuth(res);
      Toast.show({
        type: "success",
        text1: "Welcome back 🎉",
        text2: `Good to have you here, ${res.user.firstName || "Clinician"}!`,
      });
    } catch (error: any) {
      triggerShake();
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: error.response?.data?.message || "Check your credentials and try again.",
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      Toast.show({ type: "info", text1: "Enter your email address." });
      return;
    }
    setForgotLoading(true);
    try {
      await axiosInstance.post(`${baseURL}/api/v1/auth/forgot-password`, {
        email: forgotEmail.trim().toLowerCase(),
      });
      setForgotVisible(false);
      setForgotEmail("");
      Toast.show({
        type: "success",
        text1: "Check your inbox",
        text2: "If an account exists for that email, a reset link has been sent.",
        visibilityTime: 5000,
      });
    } catch {
      Toast.show({ type: "error", text1: "Something went wrong. Please try again." });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require("../../../assets/Logo.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Log in to CervixVisionAI</Text>
      <Text style={styles.subtitle}>Continue your cervical screening work ❤️‍🩹</Text>

      <Animated.View style={{ transform: [{ translateX: shakeAnim }], width: "100%" }}>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          placeholderTextColor="#9ca3af"
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={[styles.input, { marginBottom: 28 }]}
          placeholderTextColor="#9ca3af"
        />
      </Animated.View>

      <TouchableOpacity
        disabled={loading}
        onPress={handleLogin}
        style={styles.loginButton}
        activeOpacity={0.7}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>

      <View style={styles.linkRow}>
        <TouchableOpacity onPress={() => { setForgotEmail(""); setForgotVisible(true); }}>
          <Text style={styles.linkText}>Forgot Password?</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("RegisterScreen")}>
          <Text style={styles.signupText}>New here? Register</Text>
        </TouchableOpacity>
      </View>

      {/* Forgot Password Modal */}
      <Modal visible={forgotVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your account email and we'll send you a reset link.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#9ca3af"
              value={forgotEmail}
              onChangeText={setForgotEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#e5e7eb" }]}
                onPress={() => setForgotVisible(false)}
                disabled={forgotLoading}
              >
                <Text style={{ color: "#374151", fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#0EA5A4" }]}
                onPress={handleForgotPassword}
                disabled={forgotLoading}
              >
                {forgotLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: "#fff", fontWeight: "600" }}>Send Link</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 24,
  },
  logo:     { width: 120, height: 120, marginBottom: 14 },
  title:    { fontSize: 26, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#475569", marginBottom: 26 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    backgroundColor: "#fff",
    fontSize: 16,
    color: "#000",
  },
  loginButton: {
    width: "100%",
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
    alignItems: "center",
    backgroundColor: "#0EA5A4",
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 14,
  },
  linkText:   { color: "#0EA5A4", fontWeight: "600" },
  signupText: { color: "#64748B", fontWeight: "500" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    gap: 12,
  },
  modalTitle:    { fontSize: 18, fontWeight: "700", color: "#111827" },
  modalSubtitle: { fontSize: 14, color: "#6b7280", lineHeight: 20 },
  modalButtons:  { flexDirection: "row", gap: 10, marginTop: 4 },
  modalBtn:      { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10 },
});
