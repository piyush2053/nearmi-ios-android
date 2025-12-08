import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme.web";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function GlobalHeader() {
  const { logout } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const rawScheme = useColorScheme();
  const colorScheme = rawScheme ?? "dark";
  const theme = Colors[colorScheme];
  const inPublicGroup = segments[0] === "(public)";

  const [city, setCity] = useState("Locating...");
  const [address, setAddress] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setCity("Unknown");
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        const g = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (g?.length) {
          const place = g[0];
          setCity(place.city || place.name || place.district || "Unknown");
          setAddress(
            `${place.name || ""}, ${place.postalCode || ""} ${place.city || ""}`
          );
        }
      } catch {
        setCity("Unknown");
      }
    })();
  }, []);

  if (inPublicGroup) return null;

  const handleLogout = async () => {
    setModalVisible(false);
    await logout();
    router.replace("/(public)/login");
  };

  return (
    <>
      <View style={[styles.header, { backgroundColor: theme.bg7 }]}>
        {/* LEFT SIDE — Location & Address */}
        <View>
          <View style={styles.row}>
            <Ionicons name="navigate" size={18} color={theme.bg6} />
            <Text style={[styles.cityText, { color: theme.bg2 }]}>
              {city}
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={theme.bg2}
              style={{ marginLeft: 2 }}
            />
          </View>

          <Text style={[styles.addressText, { color: "#bbb" }]} numberOfLines={1}>
            {address}
          </Text>
        </View>

        {/* RIGHT SIDE — Profile Icon */}
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <View style={[styles.profileIcon, { backgroundColor: theme.bg4 }]}>
            <Feather name="user" size={18} color={theme.bg2} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Dropdown Modal */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={[styles.dropdown, { backgroundColor: theme.bg4 }]}>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={[styles.logoutText, { color: theme.bg6 }]}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    width: "100%",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  cityText: {
    fontSize:20,
    fontWeight: "700",
    marginLeft: 4,
  },

  addressText: {
    fontSize: 12,
    marginTop: 2,
    maxWidth: 260,
  },

  profileIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.15)",
  },

  dropdown: {
    marginTop: 60,
    padding: 12,
    borderRadius: 10,
    width: 120,
    elevation: 10,
  },

  logoutText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
