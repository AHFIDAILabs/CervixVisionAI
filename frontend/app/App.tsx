import React from "react";
import { View, Text, StyleSheet } from "react-native";

// TEMPORARY — minimal app for crash isolation testing.
// No providers, navigation, SQLite, SecureStore, or gesture-handler.
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello World</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  text: { fontSize: 24, fontWeight: "700" },
});
