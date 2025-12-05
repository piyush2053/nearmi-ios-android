import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import GlobalHeader from '@/components/GlobalHeader';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <NavigationGate />
    </AuthProvider>
  );
}

function NavigationGate() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    if (loading) return;

    const inPublicGroup = segments[0] === "(public)";

    if (!isAuthenticated) {
      if (!inPublicGroup) {
        router.replace("/(public)/login");
      }
    } else {
      if (inPublicGroup) {
        router.replace("/(tabs)");
      }
    }
  }, [isAuthenticated, loading, segments]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      
      {/* 🔥 Safe Area Wrapper (Top + Bottom padding) */}
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <GlobalHeader />
      </SafeAreaView>

      {/* Screens below header */}
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(public)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        </Stack>
      </View>

      <SafeAreaView edges={["bottom"]} />

      <StatusBar style="light" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#081638", // bg1 theme color (your design)
    paddingHorizontal: 10,
  },
});
