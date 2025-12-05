import { useAuth } from "@/contexts/AuthContext";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function GlobalHeader() {
  const { logout } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const inPublicGroup = segments[0] === "(public)";
  const [city, setCity] = useState<string>("Locating...");

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setCity("Unknown");
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (geocode && geocode.length > 0) {
          setCity(geocode[0].city || geocode[0].district || "Unknown");
        }
      } catch (err) {
        console.log("Location error:", err);
        setCity("Unknown");
      }
    })();
  }, []);

  if (inPublicGroup) return null;

  const handleLogout = async () => {
    await logout();
    router.replace("/(public)/login");
  };

  return (
    <View style={styles.header}>
      {/* LEFT — Location Icon + City */}
      <View style={styles.locationRow}>
        <Feather name="map-pin" size={18} color="#29C9FF" style={{ marginRight: 4 }} />
        <Text style={styles.cityText}>{city}</Text>
      </View>

      {/* RIGHT — Logout Icon */}
      <TouchableOpacity onPress={handleLogout} hitSlop={10}>
        <Feather name="log-out" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#050e24ff", // bg1
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cityText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#29C9FF", // bg6
  },
});
