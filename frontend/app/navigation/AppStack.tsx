// navigation/AppStack.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DashboardScreen from "../screens/UserDashboard/UserDash";
import ResultsScreen from "../screens/UserDashboard/results";
import Settings from "../screens/UserDashboard/UserSetting";
import UserProfile from "../screens/UserDashboard/UserProfile";
import ScanScreen from "../screens/UserDashboard/UserScan"
import { AppStackParamList } from "../../types/AppStack";

const Stack = createNativeStackNavigator<AppStackParamList>();

const AppStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardScreen" component={DashboardScreen} />
    <Stack.Screen name="ResultsScreen" component={ResultsScreen} />
    <Stack.Screen name="UserProfileScreen" component={UserProfile} />
    <Stack.Screen name="SettingScreen" component={Settings} />
    <Stack.Screen name="ScanScreen" component={ScanScreen} />
  </Stack.Navigator>
);

export default AppStack;
