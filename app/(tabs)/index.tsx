import { Colors } from "@/constants/theme";
import { useGlobalRefresh } from "@/contexts/RefreshContext";
import { core_services } from "@/services/api";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated, Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

const { width: SCREEN_W } = Dimensions.get("window");
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1A1A1A" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1A1A1A" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#e0e0e0" }] },

  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#222" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#aaaaaa" }],
  },

  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0F1115" }],
  },

  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },

  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2C2C2C" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a8a8a" }],
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "dark";
  const theme = Colors[colorScheme];
  const { refreshing, onRefresh } = useGlobalRefresh();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationEnabled, setLocationEnabled] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const mapRef = useRef<MapView | null>(null);


  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const data = await core_services.getAllEvents();
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("Error fetching events:", err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Request location (auto on screen mount)
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationEnabled(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        setLocationEnabled(true);
        setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      } catch (err) {
        console.warn("Location error:", err);
        setLocationEnabled(false);
      }
    })();
  }, []);

  // Calculate distance (Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1); // km with 1 decimal
  };

  // Sort by distance if coords available
  useEffect(() => {
    if (!userCoords || events.length === 0) return;
    const sorted = [...events].sort((a, b) => {
      const [latA, lonA] = (a.Location || "").split(",").map(Number);
      const [latB, lonB] = (b.Location || "").split(",").map(Number);

      const validA = !isNaN(latA) && !isNaN(lonA);
      const validB = !isNaN(latB) && !isNaN(lonB);
      if (!validA && !validB) return 0;
      if (!validA) return 1;
      if (!validB) return -1;

      const distA = parseFloat(calculateDistance(userCoords.lat, userCoords.lon, latA, lonA));
      const distB = parseFloat(calculateDistance(userCoords.lat, userCoords.lon, latB, lonB));
      return distA - distB;
    });
    setEvents(sorted);
  }, [userCoords, events.length]);

  // Filtered events by search & category
  const filteredEvents = useMemo(() => {
    return events
      .filter((e) => (selectedCategory ? e.Category === selectedCategory : true))
      .filter((e) => (e.EventTitle || "").toLowerCase().includes(searchText.toLowerCase()));
  }, [events, searchText, selectedCategory]);

  const categories = ["Sports", "Dance", "Music", "Food"];
  const placeholderOptions = [
    "Search Nearby 'Dance'",
    "Search Nearby 'Parties'",
    "Search Nearby 'Cricket'",
  ];

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState(placeholderOptions[0]);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const interval = setInterval(() => {
      // Animate OUT
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 10,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {

        // Change text
        setPlaceholderIndex((prev) => {
          const next = (prev + 1) % placeholderOptions.length;
          setAnimatedPlaceholder(placeholderOptions[next]);
          return next;
        });

        // Reset position
        translateY.setValue(-10);

        // Animate IN
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      });

    }, 5000);

    return () => clearInterval(interval);
  }, []);


  const focusMarker = (index: any) => {
    if (!filteredEvents[index]) return;

    const [lat, lon] = filteredEvents[index].Location.split(",").map(Number);

    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.001,
        longitudeDelta: 0.001,
      },
      600 // animation ms
    );
  };


  return (
    <View style={[styles.container, { backgroundColor: theme.bg1 }]}>
      {!locationEnabled && (
        <View style={styles.locationOverlay}>
          <View style={[styles.locationBox, { backgroundColor: "#FBBF24" }]}>
            <Text style={styles.locationText}>Please enable location and retry</Text>
            <TouchableOpacity
              onPress={async () => {
                try {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status !== "granted") {
                    setLocationEnabled(false);
                    return;
                  }
                  const pos = await Location.getCurrentPositionAsync({});
                  setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                  setLocationEnabled(true);
                } catch (e) {
                  setLocationEnabled(false);
                }
              }}
              style={styles.retryBtn}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {userCoords && (
        <View style={{ width: "100%", alignItems: "center", marginTop: 10 }}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={{ width: "95%", height: 260, borderRadius: 16 }}
            customMapStyle={darkMapStyle}
            initialRegion={{
              latitude: userCoords.lat,
              longitude: userCoords.lon,
              latitudeDelta: 0.0009,
              longitudeDelta: 0.0009,
            }}

          >
            {/* Left Navigation Button */}
            <TouchableOpacity
              onPress={() => {
                const next = currentIndex - 1 >= 0 ? currentIndex - 1 : filteredEvents.length - 1;
                setCurrentIndex(next);
                focusMarker(next);
              }}
              style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                backgroundColor: theme.bg1,
                width: 40,
                height: 40,
                borderRadius: 20,
                justifyContent: "center",
                alignItems: "center",
                shadowOpacity: 0.3,
                shadowRadius: 5,
                elevation: 8,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}><Ionicons name="arrow-back" size={20}></Ionicons></Text>
            </TouchableOpacity>


            {/* Right Navigation Button */}
            <TouchableOpacity
              onPress={() => {
                const next = currentIndex + 1 < filteredEvents.length ? currentIndex + 1 : 0;
                setCurrentIndex(next);
                focusMarker(next);
              }}
              style={{
                position: "absolute",
                bottom: 20,
                right: 20,
                backgroundColor: theme.bg1,
                width: 40,
                height: 40,
                borderRadius: 20,
                justifyContent: "center",
                alignItems: "center",
                shadowOpacity: 0.3,
                shadowRadius: 5,
                elevation: 8,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}><Ionicons name="arrow-forward" size={20}></Ionicons></Text>
            </TouchableOpacity>


            {/* USER BLUE MARKER */}
            <Marker
              coordinate={{
                latitude: userCoords.lat,
                longitude: userCoords.lon,
              }}
              anchor={{ x: 0.5, y: 1 }}
            >
              {/* Blue pin */}
              <View style={{ alignItems: "center" }}>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: "blue",
                    borderWidth: 2,
                    borderColor: "#fff",
                  }}
                />

                {/* Always visible tooltip */}
                <View
                  style={{
                    marginTop: 6,
                    backgroundColor: theme.bg1,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                    shadowColor: "#000",
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 6,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>
                    You are here
                  </Text>
                </View>
              </View>
            </Marker>


            {/* EVENT MARKERS */}
            {events.map((ev) => {
              const [lat, lon] = (ev.Location || "").split(",").map(Number);
              if (!lat || !lon) return null;

              return (
                <Marker
                  key={ev.EventID}
                  coordinate={{ latitude: lat, longitude: lon }}
                  anchor={{ x: 0.5, y: 1 }}
                  onPress={() => router.push(`/event_details?id=${ev.EventID}`)}
                  tracksViewChanges={false}
                >
                  <View style={{ alignItems: "center" }}>

                    <TouchableOpacity
                      onPress={() => router.push(`/event_details?id=${ev.EventID}`)}
                      activeOpacity={0.9}
                      style={{ alignItems: "center" }}
                    >
                      {/* Pin dot */}
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
                      <View
                        style={{
                          marginTop: 6,
                          backgroundColor: theme.bg1,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 12,
                          borderColor: theme.bg6,
                          shadowOpacity: 0.3,
                          shadowRadius: 5,
                          elevation: 6,
                          borderWidth: 0.3,
                          maxWidth: 160,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }} numberOfLines={1}>
                          {ev.EventTitle}
                        </Text>

                        <Text style={{ color: "#ffffffb5", fontSize: 10, marginTop: 2 }}>
                          {calculateDistance(userCoords.lat, userCoords.lon, lat, lon)} km away
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </Marker>
              );
            })}
          </MapView>
        </View>
      )}
      <ScrollView
        contentContainerStyle={styles.main}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.bg6}
          />
        }
      >

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: theme.bg2 }]}>Nearby</Text>
          <Text style={[styles.vibesText, { color: theme.bg6 }]}>VIBES</Text>
        </View>

        {/* Search field */}
        <View style={styles.searchWrap}>
          <Feather
            name="search"
            size={18}
            color={theme.bg2}
            style={styles.searchIcon}
          />

          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            style={[
              styles.searchInput,
              { backgroundColor: theme.bg4, color: "#fff" }
            ]}
          />

          {searchText.length === 0 && (
            <Animated.Text
              style={{
                position: "absolute",
                left: 42,
                top: 14,
                fontSize: 17,
                color: "#ffffffc2",
                opacity: fadeAnim,
                transform: [{ translateY }],
              }}
            >
              {animatedPlaceholder}
            </Animated.Text>
          )}
        </View>

        {/* Events horizontal list */}
        <View style={{ marginTop: 12 }}>
          {loading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hList}>
              <EventCardSkeleton theme={theme} />
              <EventCardSkeleton theme={theme} />
              <EventCardSkeleton theme={theme} />
              <EventCardSkeleton theme={theme} />
            </ScrollView>
          ) : filteredEvents.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hList}>
              {filteredEvents.map((event: any) => {
                const img =
                  event.EventImage ||
                  "https://assets.simpleviewinc.com/sv-visit-irving/image/upload/c_limit,h_1200,q_75,w_1200/v1/cms_resources/clients/irving-redesign/Events_Page_Header_2903ed9c-40c1-4f6c-9a69-70bb8415295b.jpg";

                // compute display date
                const eventDate = event.EventTime ? new Date(event.EventTime) : null;
                const whenText = (() => {
                  if (!eventDate) return "";
                  const now = new Date();
                  const diffMs = (eventDate as Date).getTime() - now.getTime();
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  if (diffDays >= 1 && diffDays <= 6) return `in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
                  return eventDate.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
                })();

                const distText = (() => {
                  if (!userCoords) return "Calculating distance...";
                  const [lat, lon] = (event.Location || "").split(",").map(Number);
                  if (!lat || !lon) return "N/A";
                  return `${calculateDistance(userCoords.lat, userCoords.lon, lat, lon)} km away`;
                })();

                return (
                  <TouchableOpacity
                    key={event.EventID ?? event.id ?? Math.random().toString()}
                    onPress={() => router.push(`/event_details?id=${event.EventID}`)}
                    style={[styles.eventCard, { backgroundColor: theme.bg2 }]}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: img }} style={styles.eventImage} resizeMode="cover" />
                    <View style={[styles.eventMeta, { backgroundColor: "rgba(0, 0, 0, 0.7)" }]}>
                      <Text style={styles.eventTitle} numberOfLines={1}>
                        {event.EventTitle}
                      </Text>
                      <Text style={styles.eventWhen}>{whenText}</Text>
                      <Text style={styles.eventWhen}><Ionicons name="navigate"></Ionicons> {distText}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={[styles.emptyText, { color: "#aaa" }]}>No events found.</Text>
          )}
        </View>

        {/* Filters chips */}
        {/* Filters Header with Clear Button */}
        <View style={{ marginTop: 16 }}>
          <View style={styles.filtersHeader}>
            <Text style={[styles.sectionLabel, { color: "white" }]}>Filters</Text>

            {(selectedCategory || searchText) && (
              <TouchableOpacity onPress={() => { setSelectedCategory(null); setSearchText(""); }}>
                <Text style={styles.clearFilterText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filters chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={{ flexDirection: "row", paddingRight: 8 }}>
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedCategory(active ? null : cat)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? theme.bg7 : theme.bg4,
                        borderColor: theme.bg4,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? theme.bg2 : "#bbbbbbc2", fontWeight: "600" }}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------------------------
   Event Card Skeleton (RN)
   --------------------------- */
const EventCardSkeleton = ({ theme }: { theme: any }) => {
  return (
    <View style={[styles.eventCard, { backgroundColor: theme.bg2 }]}>
      <View style={[styles.skelImg, { backgroundColor: theme.bg4 }]} />
      <View style={[styles.eventMeta, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
        <View style={[styles.skelLine, { width: "70%", backgroundColor: theme.bg4 }]} />
        <View style={[styles.skelLine, { width: "50%", backgroundColor: theme.bg4, marginTop: 6 }]} />
        <View style={[styles.skelLine, { width: "30%", backgroundColor: theme.bg4, marginTop: 6 }]} />
      </View>
    </View>
  );
};

/* ---------------------------
   Styles
   --------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  main: {
    padding: 16,
    paddingBottom: 140, // keep space for bottom tabs
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "600",
  },
  vibesText: {
    fontSize: 22,
    fontWeight: "700",
  },
  searchWrap: {
    marginTop: 15,
    position: "relative",
  },
  searchInput: {
    height: 46,
    borderRadius: 10,
    paddingLeft: 42,
    paddingVertical: 12,
    paddingRight: 16,
    borderWidth: 1,
    fontSize: 16,
  },
  searchIcon: {
    position: "absolute",
    left: 14,
    top: 14,
    zIndex: 10,
  },
  hList: {
    marginTop: 8,
  },
  eventCard: {
    width: Math.min(200, SCREEN_W * 0.56),
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#fff",
  },
  eventImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
    left: 0,
    top: 0,
  },
  skelImg: {
    width: "100%",
    height: "100%",
    position: "absolute",
    left: 0,
    top: 0,
  },
  eventMeta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: "100%",
    padding: 10,
  },
  eventTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  eventWhen: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
  },
  venueCard: {
    width: 140,
    borderRadius: 12,
    padding: 10,
    marginRight: 12,
    alignItems: "flex-start",
  },
  venueImg: {
    width: "100%",
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  venueName: {
    fontWeight: "700",
    marginBottom: 4,
  },
  skelLine: {
    height: 10,
    borderRadius: 6,
  },

  // overlay for location disabled
  locationOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 40,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  locationBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  locationText: {
    color: "#000",
    fontWeight: "700",
    marginRight: 8,
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#000",
    borderRadius: 8,
  },
  filtersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  clearFilterText: {
    color: "#bbbbbb7e",
    fontSize: 12,
    fontWeight: "600",
    padding: 4,
  },
});
