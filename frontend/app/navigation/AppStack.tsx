import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import DashboardScreen from "../screens/UserDashboard/UserDash";
import ResultsScreen from "../screens/UserDashboard/results";
import StatisticsScreen from "../screens/UserDashboard/Statistics";
import Settings from "../screens/UserDashboard/UserSetting";
import ScanScreen from "../screens/UserDashboard/UserScan";
import { AppStackParamList } from "../../types/AppStack";

const Stack = createNativeStackNavigator<AppStackParamList>();

const AppStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardScreen"  component={DashboardScreen} />
    <Stack.Screen name="ResultsScreen"    component={ResultsScreen} />
    <Stack.Screen name="StatisticsScreen" component={StatisticsScreen} />
    <Stack.Screen name="ScanScreen"       component={ScanScreen} />
    <Stack.Screen name="SettingScreen"    component={Settings} />
  </Stack.Navigator>
);

export default AppStack;
