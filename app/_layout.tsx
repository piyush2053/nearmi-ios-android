import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import GlobalHeader from '@/components/GlobalHeader';
import { Colors } from "@/constants/theme";
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
  const rawScheme = useColorScheme();
  const colorScheme = rawScheme ?? "dark"; // SAFE fallback
  const theme = Colors[colorScheme];
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

      {/* 🔥 Safe area top with bg1 */}
      <SafeAreaView style={[styles.safeTop, { backgroundColor: theme.bg7 }]} edges={["top"]}>
        <GlobalHeader />
      </SafeAreaView>

      {/* Screens below */}
      <View style={{ flex: 1, backgroundColor: theme.bg7 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(public)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        </Stack>
      </View>

      {/* Bottom safe area (for iPhone swipe bar) */}
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: theme.bg7 }} />

      <StatusBar style="light" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeTop: {
    paddingHorizontal: 10,
  },
});
