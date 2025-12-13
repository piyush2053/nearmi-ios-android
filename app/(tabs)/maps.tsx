import { Colors } from "@/constants/theme";
import { useEvents } from "@/contexts/EventsContext";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1A1A1A" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#e0e0e0" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1A1A1A" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#222" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0F1115" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2C2C2C" }] },
];

export default function MapsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "dark";
  const theme = Colors[colorScheme];
  const { events } = useEvents();

  const mapRef = useRef<MapView | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const pos = await Location.getCurrentPositionAsync({});
      setUserCoords({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
      });
    })();
  }, []);

  /* ------------------ DISTANCE ------------------ */
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    return (R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1);
  };

  /* ------------------ SORT EVENTS ------------------ */
  const sortedEvents = useMemo(() => {
    if (!userCoords) return events;

    return [...events].sort((a, b) => {
      const [latA, lonA] = (a.Location || "").split(",").map(Number);
      const [latB, lonB] = (b.Location || "").split(",").map(Number);
      if (!latA || !lonA) return 1;
      if (!latB || !lonB) return -1;

      return (
        parseFloat(calculateDistance(userCoords.lat, userCoords.lon, latA, lonA)) -
        parseFloat(calculateDistance(userCoords.lat, userCoords.lon, latB, lonB))
      );
    });
  }, [events, userCoords]);

  /* ------------------ FOCUS MARKER ------------------ */
  const focusMarker = (index: number) => {
    if (!sortedEvents[index]) return;

    const [lat, lon] = sortedEvents[index].Location.split(",").map(Number);
    if (!lat || !lon) return;

    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      600
    );
  };

  if (!userCoords) return null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg1 }}>
      <View style={{ flex: 1, position: "relative" }}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          customMapStyle={darkMapStyle}
          initialRegion={{
            latitude: userCoords.lat,
            longitude: userCoords.lon,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          {/* USER MARKER */}
          <Marker
            coordinate={{
              latitude: userCoords.lat,
              longitude: userCoords.lon,
            }}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={{ alignItems: "center" }}>
              <View style={styles.userDot} />
              <View style={styles.userLabel}>
                <Text style={styles.userLabelText}>You are here</Text>
              </View>
            </View>
          </Marker>

          {/* EVENT MARKERS */}
          {sortedEvents.map((ev) => {
            const [lat, lon] = (ev.Location || "").split(",").map(Number);
            if (!lat || !lon) return null;

            return (
              <Marker
                key={ev.EventID}
                coordinate={{ latitude: lat, longitude: lon }}
                anchor={{ x: 0.5, y: 1 }}
                tracksViewChanges={false}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => router.push(`/event_details?id=${ev.EventID}`)}
                  style={{ alignItems: "center" }}
                >
                  {/* DOT */}
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: theme.bg7,
                      borderWidth: 2,
                      borderColor: "#fff",
                    }}
                  />

                  {/* BUBBLE */}
                  <View
                    style={{
                      marginTop: 6,
                      backgroundColor: theme.bg1,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 12,
                      borderColor: theme.bg6,
                      borderWidth: 0.3,
                      shadowOpacity: 0.3,
                      shadowRadius: 5,
                      elevation: 6,
                      maxWidth: 160,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}
                      numberOfLines={1}
                    >
                      {ev.EventTitle}
                    </Text>

                    <Text style={{ color: "#ffffffb5", fontSize: 10, marginTop: 2 }}>
                      {calculateDistance(userCoords.lat, userCoords.lon, lat, lon)} km away
                    </Text>
                  </View>
                </TouchableOpacity>
              </Marker>

            );
          })}
        </MapView>

        {/* LEFT BUTTON */}
        <TouchableOpacity
          onPress={() => {
            const next =
              currentIndex - 1 >= 0 ? currentIndex - 1 : sortedEvents.length - 1;
            setCurrentIndex(next);
            focusMarker(next);
          }}
          style={[styles.navBtn, { left: 20, backgroundColor: theme.bg1 }]}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        {/* RIGHT BUTTON */}
        <TouchableOpacity
          onPress={() => {
            const next =
              currentIndex + 1 < sortedEvents.length ? currentIndex + 1 : 0;
            setCurrentIndex(next);
            focusMarker(next);
          }}
          style={[styles.navBtn, { right: 20, backgroundColor: theme.bg1 }]}
        >
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <View
        style={{
          width: "100%",
          height: 15,
          backgroundColor: "#262626f2",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          marginTop: -26,
          zIndex: 1
        }}
      />
    </View>
  );
}

/* ------------------ STYLES ------------------ */
const styles = StyleSheet.create({
  userDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#3b82f6",
    borderWidth: 2,
    borderColor: "#fff",
  },
  eventDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#29C9FF",
    borderWidth: 2,
    borderColor: "#fff",
  },
  userLabel: {
    marginTop: 6,
    backgroundColor: "#111",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffffff30",
    elevation: 6,
  },
  userLabelText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  navBtn: {
    position: "absolute",
    bottom: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 999,
  },
});
