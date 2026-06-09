import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Home from "../screens/home";
import CentreRegisterScreen from "../screens/CentreScreen/CentreRegisterScreen";
import CentreLoginScreen from "../screens/CentreScreen/CentreLoginScreen";
import { CentreStackParamList } from "../../types/centre";

const Stack = createNativeStackNavigator<CentreStackParamList>();

const CentreStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="home"                 component={Home} />
    <Stack.Screen name="CentreRegisterScreen" component={CentreRegisterScreen} />
    <Stack.Screen name="CentreLoginScreen"    component={CentreLoginScreen} />
  </Stack.Navigator>
);

export default CentreStack;
