// app/_components/BottomNavigationBar.tsx (FINAL CORRECTED VERSION)

import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  CommonActions,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useAuth } from "../../Context/AuthContext";
import { AppStackParamList } from "../../types/AppStack";

// --- TYPE DEFINITIONS ---
// Consolidated screen names from both AuthStack and AppStack
// type AppStackParamList = {
//     // Screens from your AppStack.tsx
//     DashboardScreen: undefined;
//     ResultsScreen: undefined; // Included ResultsScreen, though not in bottom bar
//     UserProfileScreen: { userId?: string };
//     SettingScreen: undefined;

//     // Assume these authenticated screens exist in AppStack
//     ChatListScreen: { userId?: string, senderId?: string, token?: string };
//     SearchScreen: undefined;

//     // Screen from your AuthStack.tsx (needed for redirect)
//     LoginScreen: undefined;
// };

// Use keyof AppStackParamList for more robust typing
type AppNavProp = StackNavigationProp<
  AppStackParamList,
  keyof AppStackParamList
>;

interface Props {
  // Tabs based on the main AppStack screens
  active: "dashboard" | "results" | "scan" | "profile" | "settings";
}

const BottomNavigationBar: React.FC<Props> = ({ active: passedActiveKey }) => { 
const { user, accessToken } = useAuth();
  const insets = useSafeAreaInsets();

  const navigation = useNavigation<AppNavProp>();
  const route = useRoute();
  const userId = user?.id;

  // Map current route name to the active tab key
const getActiveTab = (): Props["active"] => {
    const routeName = route.name;

    if (routeName === "DashboardScreen") return "dashboard";
    // 👇 ScanScreen gets its own key
    if (routeName === "ScanScreen") return "scan";
    // 👇 ResultsScreen gets its own key
    if (routeName === "ResultsScreen") return "results";
    if (routeName === "UserProfileScreen") return "profile";
    if (routeName === "SettingScreen") return "settings";
    

    return "dashboard"; // Default
  };

  const routeActiveKey = getActiveTab();
  
// 👇 The logic MUST now use this key
 const iconColor = (tab: Props["active"]) =>
 routeActiveKey === tab ? "#FBC02D" : "#FAFAFA";

  const navigateWithCheck = (
    screenName: keyof AppStackParamList,
    params?: any
  ) => {
    if (userId && accessToken) {
      // Check if already on the screen
      if (route.name !== screenName) {
        navigation.navigate(screenName, params);
      }
    } else {
      // Redirect to the Login Screen (correct screen name used)
      navigation.dispatch(CommonActions.navigate("LoginScreen"));
    }
  };

  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom || 12 }]}>
      

      <TouchableOpacity onPress={() => navigateWithCheck("DashboardScreen")}>
 
        <Ionicons name="home" size={28} color={iconColor("dashboard")} />
 
      </TouchableOpacity>
    

      <TouchableOpacity onPress={() => navigateWithCheck("ScanScreen")}>
    
        <Ionicons name="albums" size={28} color={iconColor("scan")} />
   
      </TouchableOpacity>
 
     
      <TouchableOpacity onPress={() => navigateWithCheck("ResultsScreen")}>
 
        <Ionicons name="list" size={28} color={iconColor("results")} />
     
      </TouchableOpacity>
  
    
      <TouchableOpacity onPress={() => navigateWithCheck("SettingScreen")}>
   
        <Ionicons name="settings" size={28} color={iconColor("settings")} />
  
      </TouchableOpacity>
    
 
      <TouchableOpacity
        onPress={() => navigateWithCheck("UserProfileScreen", { userId })}
      >

        <Ionicons name="person-circle" size={28} color={iconColor("profile")} />
   
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
