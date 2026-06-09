import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AppStackParamList } from "../../types/AppStack";

type AppNavProp = StackNavigationProp<AppStackParamList, keyof AppStackParamList>;

interface Props {
  active: "dashboard" | "results" | "scan" | "settings";
}

const BottomNavigationBar: React.FC<Props> = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AppNavProp>();
  const route = useRoute();

  const getActiveTab = (): Props["active"] => {
    switch (route.name) {
      case "DashboardScreen": return "dashboard";
      case "ScanScreen":      return "scan";
      case "ResultsScreen":   return "results";
      case "SettingScreen":   return "settings";
      default:                return "dashboard";
    }
  };

  const active = getActiveTab();
  const iconColor = (tab: Props["active"]) => (active === tab ? "#FBC02D" : "#FAFAFA");

  const navigateTo = (screenName: keyof AppStackParamList) => {
    if (route.name !== screenName) navigation.navigate(screenName);
  };

  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom || 12 }]}>
      <TouchableOpacity onPress={() => navigateTo("DashboardScreen")}>
        <Ionicons name="home" size={28} color={iconColor("dashboard")} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigateTo("ScanScreen")}>
        <Ionicons name="albums" size={28} color={iconColor("scan")} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigateTo("ResultsScreen")}>
        <Ionicons name="list" size={28} color={iconColor("results")} />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigateTo("SettingScreen")}>
        <Ionicons name="settings" size={28} color={iconColor("settings")} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#001F3F",
    borderTopWidth: 1,
    borderTopColor: "#ffffff22",
    paddingVertical: 14,
  },
});

export default BottomNavigationBar;
