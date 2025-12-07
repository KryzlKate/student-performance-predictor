import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, Tabs } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { StudentProvider } from "../contexts/StudentContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="input" options={{ title: "Student Data" }} />
      <Stack.Screen name="results" options={{ title: "Prediction Results" }} />
      <Stack.Screen name="history" options={{ title: "Student History" }} />
      <Stack.Screen name="analytics" options={{ title: "Analytics Dashboard" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StudentProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </StudentProvider>
    </QueryClientProvider>
  );
}