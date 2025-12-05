import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSegments } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function GlobalHeader() {
  const { logout } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const inPublicGroup = segments[0] === "(public)";

  // Don't show on login/register screens
  if (inPublicGroup) return null;

  const handleLogout = async () => {
    await logout();        // clears token + user
    router.replace("/(public)/login");
  };

  return (
    <View style={styles.header}>
      <Text style={styles.logo}>NearMi</Text>

      <TouchableOpacity onPress={handleLogout}>
        <Text style={styles.logout}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#081638", // bg1
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    fontSize: 20,
    fontWeight: "700",
    color: "#29C9FF", // bg6
  },
  logout: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
});
