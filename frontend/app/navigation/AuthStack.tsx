import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/AuthScreen/LoginScreen";
import RegisterScreen from "../screens/AuthScreen/RegisterScreen";
import ResetPasswordScreen from "../screens/AuthScreen/ResetPasswordScreen";
import Home from "../screens/home";
import { AuthStackParamList } from "../../types/auth";

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="home"                component={Home} />
    <Stack.Screen name="LoginScreen"         component={LoginScreen} />
    <Stack.Screen name="RegisterScreen"      component={RegisterScreen} />
    <Stack.Screen name="ResetPasswordScreen" component={ResetPasswordScreen} />
  </Stack.Navigator>
);

export default AuthStack;
