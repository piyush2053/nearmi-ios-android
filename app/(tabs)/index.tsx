
import { Colors } from "@/constants/theme";
import { useGlobalRefresh } from "@/contexts/RefreshContext";
import { core_services } from "@/services/api";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
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

const { width: SCREEN_W } = Dimensions.get("window");

// Hardcoded hosted venues (you provided)
const hostedVenues = [
  {
    id: 101,
    name: "Carlton Banquet Hall",
    desc: "Luxury indoor hall",
    img: "https://assets.simpleviewinc.com/sv-visit-irving/image/upload/c_limit,h_1200,q_75,w_1200/v1/cms_resources/clients/irving-redesign/Events_Page_Header_2903ed9c-40c1-4f6c-9a69-70bb8415295b.jpg",
  },
  {
    id: 102,
    name: "Green Turf Ground",
    desc: "Cricket Box - Turf",
    img: "https://assets.simpleviewinc.com/sv-visit-irving/image/upload/c_limit,h_1200,q_75,w_1200/v1/cms_resources/clients/irving-redesign/Events_Page_Header_2903ed9c-40c1-4f6c-9a69-70bb8415295b.jpg",
  },
  {
    id: 103,
    name: "Blue Lagoon Resort",
    desc: "Pool + Party venue",
    img: "https://assets.simpleviewinc.com/sv-visit-irving/image/upload/c_limit,h_1200,q_75,w_1200/v1/cms_resources/clients/irving-redesign/Events_Page_Header_2903ed9c-40c1-4f6c-9a69-70bb8415295b.jpg",
  },
  {
    id: 104,
    name: "The Roof Deck",
    desc: "Open sky cafe event space",
    img: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 105,
    name: "Bhukkad Dhabha",
    desc: "Dinner with Strangers",
    img: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: 106,
    name: "Skyline",
    desc: "Open sky cafe event space",
    img: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=400&q=80",
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

  return (
    <View style={[styles.container, { backgroundColor: theme.bg1 }]}>
      {/* Hidden span equivalent removed (not needed in RN) */}

      {/* Location disabled overlay */}
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
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search nearby events..."
            placeholderTextColor={"#bbb"}
            style={[styles.searchInput, { borderColor: theme.bg6, color: theme.bg2 }]}
          />
          <Feather name="search" size={18} color={theme.bg2} style={styles.searchIcon} />
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
                    <View style={[styles.eventMeta, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
                      <Text style={styles.eventTitle} numberOfLines={1}>
                        {event.EventTitle}
                      </Text>
                      <Text style={styles.eventWhen}>{whenText}</Text>
                      <Text style={styles.eventWhen}>{distText}</Text>
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
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.sectionLabel, { color: theme.bg2 }]}>Filters</Text>
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
                        backgroundColor: active ? theme.bg6 : theme.bg2,
                        borderColor: theme.bg4,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? theme.bg2 : theme.bg1, fontWeight: "600" }}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Hosted Venues (hardcoded display simplified) */}
        <View style={{ marginTop: 20 }}>
          <Text style={[styles.sectionLabel, { color: theme.bg2, marginBottom: 8 }]}>Hosted Venues</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hList}>
            {hostedVenues.slice(0, 3).map((v) => (
              <View key={v.id} style={[styles.venueCard, { backgroundColor: theme.bg4 }]}>
                <Image source={{ uri: v.img }} style={styles.venueImg} />
                <Text style={[styles.venueName, { color: theme.bg2 }]} numberOfLines={1}>
                  {v.name}
                </Text>
                <Text style={{ color: "#bbb", fontSize: 12 }}>{v.desc}</Text>
              </View>
            ))}
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
    fontSize: 18,
    fontWeight: "700",
  },
  vibesText: {
    fontSize: 18,
    fontWeight: "800",
  },
  searchWrap: {
    marginTop: 12,
    position: "relative",
  },
  searchInput: {
    height: 46,
    borderRadius: 999,
    paddingLeft: 16,
    paddingRight: 42,
    borderWidth: 1,
    fontSize: 14,
  },
  searchIcon: {
    position: "absolute",
    right: 14,
    top: 12,
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
    fontSize: 14,
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
});
