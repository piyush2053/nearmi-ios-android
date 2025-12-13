import { SPONSORED_EVENTS } from "@/constants/sponseredEvents";
import { Colors } from "@/constants/theme";
import { useEvents } from "@/contexts/EventsContext";
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
const gif_placeholder = require("../../assets/gifs/pl1.gif");

const { width: SCREEN_W } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "dark";
  const theme = Colors[colorScheme];
  const { events, loading, refreshEvents } = useEvents();
  const [searchText, setSearchText] = useState<string>("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationEnabled, setLocationEnabled] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);



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
  const sortedEvents = useMemo(() => {
    if (!userCoords) return events;

    return [...events].sort((a, b) => {
      const [latA, lonA] = (a.Location || "").split(",").map(Number);
      const [latB, lonB] = (b.Location || "").split(",").map(Number);

      if (!latA || !lonA) return 1;
      if (!latB || !lonB) return -1;

      const distA = parseFloat(
        calculateDistance(userCoords.lat, userCoords.lon, latA, lonA)
      );
      const distB = parseFloat(
        calculateDistance(userCoords.lat, userCoords.lon, latB, lonB)
      );

      return distA - distB;
    });
  }, [events, userCoords]);

  const filteredEvents = useMemo(() => {
    return sortedEvents
      .filter((e) =>
        selectedCategory ? e.Category === selectedCategory : true
      )
      .filter((e) =>
        (e.EventTitle || "")
          .toLowerCase()
          .includes(searchText.toLowerCase())
      );
  }, [sortedEvents, searchText, selectedCategory]);

  const searchResults = useMemo(() => {
    if (!searchText.trim()) return [];
    return events.filter(e =>
      (e.EventTitle || "").toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText, events]);
  const highlight = (text: string, query: string) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        return (
          <Text key={i} style={{ color: "#FFD54F", fontWeight: "700" }}>
            {part}
          </Text>
        );
      }
      return (
        <Text key={i} style={{ color: "#fff" }}>
          {part}
        </Text>
      );
    });
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


      <ScrollView
        contentContainerStyle={styles.main}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshEvents}
          />
        }
      >

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: theme.bg2 }]}>Upcoming</Text>
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
            onFocus={() => setShowSearchDropdown(true)}
            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
            onChangeText={(t) => {
              setSearchText(t);
              setShowSearchDropdown(true);
            }}
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
        {showSearchDropdown && searchText?.trim().length > 0 && (
          <View style={[styles.dropdownBox, { backgroundColor: theme.bg7 }]}>
            {searchResults.length === 0 ? (
              <Text style={styles.noResults}>No results found.</Text>
            ) : (
              searchResults.map((item: any) => (
                <TouchableOpacity
                  key={item.EventID}
                  style={styles.dropdownRow}
                  onPress={() => {
                    setShowSearchDropdown(false);
                    router.push(`/event_details?id=${item.EventID}`);
                  }}
                >
                  <Image
                    source={{ uri: item.EventImage }}
                    style={styles.dropdownImg}
                  />

                  <Text style={styles.dropdownTitle}>
                    {highlight(item.EventTitle, searchText)}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <View style={{ marginTop: 5 }}>
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

                const isURL = event.EventImage && event.EventImage.startsWith("http");

                const imgSource = isURL
                  ? { uri: event.EventImage }
                  : gif_placeholder;

                const eventDate = event.EventTime ? new Date(event.EventTime) : null;

                const whenText = (() => {
                  if (!eventDate) return "";
                  const now = new Date();
                  const diffMs = eventDate.getTime() - now.getTime();
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  if (diffDays >= 1 && diffDays <= 6)
                    return `in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
                  return eventDate.toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                })();

                const distText = (() => {
                  if (!userCoords) return "Calculating distance...";
                  const [lat, lon] = (event.Location || "").split(",").map(Number);
                  if (!lat || !lon) return "N/A";
                  return `${calculateDistance(userCoords.lat, userCoords.lon, lat, lon)} km away`;
                })();

                return (
                  <TouchableOpacity
                    key={event.EventID}
                    onPress={() => router.push(`/event_details?id=${event.EventID}`)}
                    style={[styles.eventCardNew, { backgroundColor: theme.bg7 }]}
                    activeOpacity={0.85}
                  >
                    {/* LEFT IMAGE */}
                    <Image source={imgSource} style={styles.eventImgNew} />

                    {/* RIGHT CONTENT */}
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventDate}>{whenText}</Text>

                      <Text style={styles.eventTitleNew} numberOfLines={2}>
                        {event.EventTitle}
                      </Text>

                      <View style={styles.eventLocationRow}>
                        <Ionicons name="location-outline" size={14} color="#999" />
                        <Text style={styles.eventLocationText}>{distText}</Text>
                      </View>
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
        {/* ---------------- Sponsored / Paid Events ---------------- */}
        <View style={{ marginTop: 22 }}>
          <View style={styles.filtersHeader}>
            <Text style={[styles.sectionLabel, { color: "white" }]}>
              Sponsored & Paid
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 10 }}
          >
            {SPONSORED_EVENTS.map((item: any) => (
              <View
                key={item.id}
                style={[
                  styles.eventCard,
                  {
                    backgroundColor: theme.bg2,
                    marginRight: 14,
                  },
                ]}
              >
                <Image
                  source={{ uri: item.image }}
                  style={styles.eventImage}
                  resizeMode="cover"
                />
                <View
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    backgroundColor: "#FACC15",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 999,
                  }}
                >
                  <Text style={{ color: "#000", fontSize: 10, fontWeight: "700" }}>
                    {item.type}
                  </Text>
                </View>

                {/* Meta */}
                <View
                  style={[
                    styles.eventMeta,
                    { backgroundColor: "rgba(0,0,0,0.75)" },
                  ]}
                >
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {item.title}
                  </Text>

                  <Text style={{ color: "#ffffffb5", fontSize: 11, marginTop: 4 }}>
                    By {item.publisher}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
        {/* Tip Card Below Sponsored Section */}
        <View style={[styles.tipCard, { backgroundColor: theme.bg4 }]}>
          <Text style={styles.tipText}>
            Tip: These sponsored and paid promotions may result in additional charges. Thank you!
          </Text>
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
    <View style={[styles.eventCardSkelton, { backgroundColor: theme.bg2 }]}>
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
  eventCardSkelton: {
    width: Math.min(200, SCREEN_W * 0.56),
    height: 100,
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
  eventCardNew: {
    width: 250,
    height: 110,
    borderRadius: 18,
    flexDirection: "row",
    padding: 10,
    marginRight: 14,
    alignItems: "center",
  },

  eventImgNew: {
    width: 90,
    height: "100%",
    borderRadius: 14,
  },

  eventInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },

  eventDate: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },

  eventTitleNew: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
  },

  eventLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  eventLocationText: {
    color: "#aaa",
    marginLeft: 4,
    fontSize: 12,
  },
  tipCard: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  tipText: {
    fontSize: 12,
    color: "#ffffff94",
    textAlign: "left",
    lineHeight: 16,
    fontWeight: "500",
  },
  dropdownBox: {
    width: "100%",
    marginTop: 6,
    borderRadius: 12,
    paddingVertical: 8,
    maxHeight: 300,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ffffff22",
  },

  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  dropdownImg: {
    width: 45,
    height: 45,
    borderRadius: 8,
    marginRight: 12,
  },

  dropdownTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },

  noResults: {
    textAlign: "center",
    color: "#aaaaaa",
    padding: 10,
  }

});
