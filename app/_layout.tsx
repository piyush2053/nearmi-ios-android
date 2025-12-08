import GlobalHeader from '@/components/GlobalHeader';
import { Colors } from "@/constants/theme";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { RefreshProvider } from '@/contexts/RefreshContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import "@/notifications/setup";
import { applyGlobalFont } from "@/utils/FontOverride";
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// -----------------------------
// ROOT LAYOUT – LOAD FONTS HERE
// -----------------------------
export default function RootLayout() {

  const [loaded] = useFonts({
    "Cereal-Regular": require("../assets/fonts/AirbnbCereal_W_Bk.otf"),
    "Cereal-Medium": require("../assets/fonts/AirbnbCereal_W_Md.otf"),
    "Cereal-Bold": require("../assets/fonts/AirbnbCereal_W_Bd.otf"),
    "Cereal-ExtraBold": require("../assets/fonts/AirbnbCereal_W_XBd.otf"),
    "Cereal-Light": require("../assets/fonts/AirbnbCereal_W_Lt.otf"),
    "Cereal-Black": require("../assets/fonts/AirbnbCereal_W_Blk.otf"),
  });

  // Apply font globally AFTER loading
  useEffect(() => {
    if (loaded) applyGlobalFont();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <NavigationGate />
    </AuthProvider>
  );
}


// -----------------------------
// AUTH / ROUTING HANDLER
// -----------------------------
function NavigationGate() {
  const rawScheme = useColorScheme();
  const colorScheme = rawScheme ?? "dark";
  const theme = Colors[colorScheme];
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inPublic = segments[0] === "(public)";

    if (!isAuthenticated) {
      if (!inPublic) router.replace("/(public)/login");
    } else {
      if (inPublic) router.replace("/(tabs)");
    }
  }, [isAuthenticated, loading, segments]);

  return (
    <RefreshProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        
        {/* TOP SAFE AREA + HEADER */}
        <SafeAreaView style={[styles.safeTop, { backgroundColor: theme.bg7 }]} edges={["top"]}>
          <GlobalHeader />
        </SafeAreaView>

        {/* MAIN CONTENT */}
        <View style={{ flex: 1, backgroundColor: theme.bg7 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(public)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="modal" options={{ presentation: "modal" }} />
          </Stack>
        </View>

        {/* BOTTOM SAFE AREA */}
        <SafeAreaView edges={["bottom"]} style={{ backgroundColor: theme.bg1 }} />

        <StatusBar style="light" />
      </ThemeProvider>
    </RefreshProvider>
  );
}

const styles = StyleSheet.create({
  safeTop: {
    paddingHorizontal: 10,
  },
});
