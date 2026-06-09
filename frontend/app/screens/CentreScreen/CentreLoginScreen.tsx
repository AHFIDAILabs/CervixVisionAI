import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCentre } from "../../../Context/CentreContext";
import { CentreStackParamList } from "../../../types/centre";

type Nav = NativeStackNavigationProp<CentreStackParamList, "CentreLoginScreen">;

export default function CentreLoginScreen() {
  const navigation = useNavigation<Nav>();
  const { loginWithCode } = useCentre();

  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleLogin = async () => {
    if (code.trim().length < 8) {
      setError("Please enter a valid 9-character code (e.g. X3K2-M9PQ).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const success = await loginWithCode(code.trim());
      if (!success) {
        setError("Code not found on this device. Check the code or register a new centre.");
      }
      // If success, CentreContext sets centre → AppNavigator renders AppStack automatically
    } finally {
      setLoading(false);
    }
  };

  const formatCode = (text: string) => {
    // Auto-insert dash after 4th char
    const clean = text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    return clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
  };

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back" size={24} color="#374151" />
      </TouchableOpacity>

      <MaterialIcons name="vpn-key" size={56} color="#0EA5A4" style={styles.icon} />
      <Text style={styles.title}>Enter Centre Code</Text>
      <Text style={styles.subtitle}>
        Type the 9-character code that was generated when this centre was first registered on this device.
      </Text>

      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholder="XXXX-XXXX"
        placeholderTextColor="#9ca3af"
        value={code}
        onChangeText={(t) => { setCode(formatCode(t)); setError(null); }}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={9}
        returnKeyType="done"
        onSubmitEditing={handleLogin}
      />

      {error ? (
        <View style={styles.errorBox}>
          <MaterialIcons name="error-outline" size={16} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryBtn, (!code.trim() || loading) && styles.btnDisabled]}
        onPress={handleLogin}
        disabled={!code.trim() || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>Enter App</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => navigation.navigate("CentreRegisterScreen")}
      >
        <Text style={styles.linkText}>Register a new health centre →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: "#fff", padding: 28, alignItems: "center" },
  backBtn: { alignSelf: "flex-start", marginBottom: 24, padding: 4 },
  icon: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "800", color: "#111827", textAlign: "center", marginBottom: 10 },
  subtitle: {
    fontSize: 15, color: "#6b7280", textAlign: "center",
    lineHeight: 22, marginBottom: 28,
  },
  input: {
    width: "100%", borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 28, fontWeight: "700",
    letterSpacing: 6, color: "#111827", backgroundColor: "#f9fafb",
    textAlign: "center", marginBottom: 12,
  },
  inputError: { borderColor: "#ef4444" },
  errorBox: {
    width: "100%", flexDirection: "row", alignItems: "flex-start", gap: 6,
    backgroundColor: "#fef2f2", borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: "#fecaca", marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: "#ef4444", lineHeight: 18 },
  primaryBtn: {
    width: "100%", backgroundColor: "#0EA5A4", paddingVertical: 15,
    borderRadius: 12, alignItems: "center", marginBottom: 16,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnDisabled: { opacity: 0.45 },
  linkBtn: { padding: 8 },
  linkText: { color: "#2563eb", fontSize: 14, fontWeight: "600" },
});
