import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
  Image,
} from "react-native";
import Toast from "react-native-toast-message";
import { useAuth } from "../../../Context/AuthContext";
import { loginUser } from "../../../Services/authService";
import { AuthResponse } from "../../../types/auth";
import { useNavigation } from "expo-router";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../../types/auth";

type AuthNav = StackNavigationProp<AuthStackParamList, "LoginScreen">;

export default function LoginScreen() {
  const { handleSuccessfulAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<AuthNav>();

  const handleLogin = async () => {
    if (!email || !password) {
      triggerShake();
      Toast.show({
        type: "info",
        text1: "Hold up!",
        text2: "Your email and password can’t be empty.",
      });
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
      console.error("Login Error:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Login failed. Double-check your credentials.";

      triggerShake();

      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: errorMessage,
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      {/* Branding Logo */}
      <Image
        source={require("../../../assets/Logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Log in to AVE</Text>
      <Text style={styles.subtitle}>
        Continue your cervical screening work ❤️‍🩹
      </Text>

      <Animated.View
        style={{
          transform: [{ translateX: shakeAnim }],
          width: "100%",
        }}
      >
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={[styles.input, { marginBottom: 28 }]}
        />
      </Animated.View>

      <TouchableOpacity
        disabled={loading}
        onPress={handleLogin}
        style={styles.loginButton}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          width: "100%",
          marginTop: 14,
        }}
      >
        <TouchableOpacity onPress={() => {}}>
          <Text style={styles.linkText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("RegisterScreen")}>
          <Text style={styles.signupText}>New here? Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// 🎨 Stylesheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "#475569",
    marginBottom: 26,
  },
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
    backgroundColor: "#0EA5A4", // matches AVE brand color from HomeScreen
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  linkText: {
    color: "#0EA5A4",
    fontWeight: "600",
  },
  signupText: {
    color: "#64748B",
    fontWeight: "500",
  },
});
