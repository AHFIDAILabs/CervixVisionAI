import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../types/auth";

type WelcomeScreenProp = NativeStackNavigationProp<
  AuthStackParamList,
  "WelcomeScreen"
>;

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp<AuthStackParamList>>();

  return (
    <View style={styles.container}>
     
      <Image
        source={{ uri: "https://example.com/welcome-illustration.png" }}
        style={styles.image}
        resizeMode="contain"
      />

     
      <Text style={styles.title}>Welcome to AHFID HealthApp</Text>
      <Text style={styles.subtitle}>Your health, our priority</Text>

 
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.loginButton]}
          onPress={() => navigation.navigate("LoginScreen")}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.registerButton]}
          onPress={() => navigation.navigate("RegisterScreen")}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  image: {
    width: 220,
    height: 220,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 40,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  loginButton: {
    backgroundColor: '#001F3F',
  },
  registerButton: {
    backgroundColor: "#10b981",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
