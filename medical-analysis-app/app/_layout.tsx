// app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../Context/AuthContext';
import BottomNavigationBar from './Components/BottomBar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="Auth" />
        <Stack.Screen name="Home" />
        <Stack.Screen name="UserDashboardScreen" />
        <Stack.Screen name="SearchScreen" />
        <Stack.Screen name="UserProfile" />
      </Stack>
      <BottomNavigationBar active={'dashboard'} />
    </AuthProvider>
  );
}