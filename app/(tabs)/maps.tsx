import { Colors } from "@/constants/theme";
import { useEvents } from "@/contexts/EventsContext";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import _ from "lodash";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";

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

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1A1A1A" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#e0e0e0" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1A1A1A" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#222" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0F1115" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2C2C2C" }] },
];

// Pre-create style objects to avoid recreation
const createMarkerStyles = (dotColor: string, bgColor: string, borderColor: string) => ({
  dot: { ...styles.eventDot, backgroundColor: dotColor },
  label: { ...styles.eventLabel, backgroundColor: bgColor, borderColor },
});

// Memoized Marker Component with static styles
const EventMarker = React.memo(({ 
  event, 
  onPress, 
  markerStyles
}: any) => {
  return (
    <Marker
      coordinate={{ latitude: event._lat, longitude: event._lon }}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={false}
      onPress={onPress}
      identifier={event.EventID}
    >
      <View style={styles.markerContainer}>
        <View style={markerStyles.dot} />
        <View style={markerStyles.label}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {event.EventTitle}
          </Text>
          <Text style={styles.eventDistance}>
            {event._distance < 999999 ? `${event._distance} km away` : ""}
          </Text>
        </View>
      </View>
    </Marker>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.event.EventID === nextProps.event.EventID &&
    prevProps.markerStyles === nextProps.markerStyles
  );
});

export default function MapsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "dark";
  const theme = Colors[colorScheme];
  const { events } = useEvents();

  const mapRef = useRef<MapView | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mapReady, setMapReady] = useState(false);
  const [visibleRegion, setVisibleRegion] = useState<Region | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      } catch (error) {
        // Location fetch failed silently
      }
    })();
  }, []);

  // Create marker styles once per theme change
  const markerStyles = useMemo(
    () => createMarkerStyles(theme.bg7, theme.bg1, theme.bg6),
    [theme.bg7, theme.bg1, theme.bg6]
  );

  // Pre-calculate and filter events
  const sortedEvents = useMemo(() => {
    if (!userCoords) return [];

    return events
      .map(ev => {
        const [lat, lon] = (ev.Location || "").split(",").map(Number);
        const distance = lat && lon
          ? parseFloat(calculateDistance(userCoords.lat, userCoords.lon, lat, lon))
          : 999999;

        return {
          ...ev,
          _lat: lat,
          _lon: lon,
          _distance: distance,
        };
      })
      .filter(ev => ev._lat && ev._lon && ev._distance < 50)
      .sort((a, b) => a._distance - b._distance)
      .slice(0, 20);
  }, [events, userCoords]);

  // Optimized visible region filtering
  const visibleEvents = useMemo(() => {
    if (!visibleRegion || !mapReady) return sortedEvents.slice(0, 10);

    const { latitude, longitude, latitudeDelta, longitudeDelta } = visibleRegion;
    const latBuffer = latitudeDelta * 0.5;
    const lonBuffer = longitudeDelta * 0.5;

    return sortedEvents.filter(ev => 
      Math.abs(ev._lat - latitude) < latBuffer &&
      Math.abs(ev._lon - longitude) < lonBuffer
    );
  }, [sortedEvents, visibleRegion, mapReady]);

  // Throttled region change handler - created once
  const handleRegionChange = useMemo(
    () =>
      _.throttle((region: Region) => {
        setVisibleRegion(region);
      }, 500),
    []
  );

  // Focus marker handler
  const focusMarkerThrottled = useMemo(
    () =>
      _.throttle((index: number) => {
        if (!sortedEvents[index]) return;
        const { _lat: lat, _lon: lon } = sortedEvents[index];
        if (!lat || !lon) return;

        mapRef.current?.animateToRegion(
          {
            latitude: lat,
            longitude: lon,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          400
        );
      }, 500),
    [sortedEvents]
  );

  const handleNavigation = useCallback((direction: 'prev' | 'next') => {
    setCurrentIndex(prev => {
      const next = direction === 'prev'
        ? (prev - 1 >= 0 ? prev - 1 : sortedEvents.length - 1)
        : (prev + 1 < sortedEvents.length ? prev + 1 : 0);
      
      focusMarkerThrottled(next);
      return next;
    });
  }, [sortedEvents.length, focusMarkerThrottled]);

  const handleMarkerPress = useCallback((eventId: string) => {
    router.push(`/event_details?id=${eventId}`);
  }, [router]);

  // User marker with static styles
  const memoUserMarker = useMemo(() => {
    if (!userCoords) return null;
    
    return (
      <Marker
        coordinate={{ latitude: userCoords.lat, longitude: userCoords.lon }}
        anchor={{ x: 0.5, y: 1 }}
        tracksViewChanges={false}
        identifier="user-location"
      >
        <View style={styles.userMarkerContainer}>
          <View style={styles.userDot} />
          <View style={styles.userLabel}>
            <Text style={styles.userLabelText}>You are here</Text>
          </View>
        </View>
      </Marker>
    );
  }, [userCoords]);

  // Optimized markers rendering
  const memoizedMarkers = useMemo(() => {
    if (!mapReady) return null;

    return visibleEvents.map((ev) => (
      <EventMarker
        key={ev.EventID}
        event={ev}
        onPress={() => handleMarkerPress(ev.EventID)}
        markerStyles={markerStyles}
      />
    ));
  }, [visibleEvents, mapReady, handleMarkerPress, markerStyles]);

  // Loading state
  if (!userCoords) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg1 }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.bg7} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg1 }]}>
      <View style={styles.mapContainer}>
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
          onMapReady={() => setMapReady(true)}
          onRegionChangeComplete={handleRegionChange}
          moveOnMarkerPress={false}
          loadingEnabled={true}
          loadingIndicatorColor={theme.bg7}
          maxZoomLevel={18}
          minZoomLevel={10}
          pitchEnabled={false}
          rotateEnabled={false}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
        >
          {memoUserMarker}
          {memoizedMarkers}
        </MapView>

        {/* Loading Overlay */}
        {!mapReady && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {/* Event Counter */}
        {mapReady && sortedEvents.length > 0 && (
          <View style={[styles.counterBadge, { backgroundColor: theme.bg1 }]}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {sortedEvents.length}
            </Text>
          </View>
        )}

        {/* Navigation Buttons */}
        {sortedEvents.length > 1 && (
          <>
            <TouchableOpacity
              onPress={() => handleNavigation('prev')}
              style={[styles.navBtn, styles.navBtnLeft, { backgroundColor: theme.bg1 }]}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleNavigation('next')}
              style={[styles.navBtn, styles.navBtnRight, { backgroundColor: theme.bg1 }]}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </View>
      
      <View style={styles.bottomCurve} />
    </View>
  );
}

/* ------------------ STYLES ------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#fff",
    fontSize: 14,
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  counterBadge: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 50,
  },
  counterText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  userMarkerContainer: {
    alignItems: "center",
  },
  userDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#3b82f6",
    borderWidth: 2,
    borderColor: "#fff",
  },
  eventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  },
  userLabelText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  markerContainer: {
    alignItems: "center",
  },
  eventLabel: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 0.3,
    maxWidth: 160,
    alignItems: "center",
  },
  eventTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  eventDistance: {
    color: "#ffffffb5",
    fontSize: 10,
    marginTop: 2,
  },
  navBtn: {
    position: "absolute",
    bottom: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999
  },
  navBtnLeft: {
    left: 20,
  },
  navBtnRight: {
    right: 20,
  },
  bottomCurve: {
    width: "100%",
    height: 15,
    backgroundColor: "#262626f2",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginTop: -26,
    zIndex: 1,
  },
});