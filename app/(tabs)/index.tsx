import { SPONSORED_EVENTS } from "@/constants/sponseredEvents";
import { Colors } from "@/constants/theme";
import { useEvents } from "@/contexts/EventsContext";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
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

// Shared utility - move to separate file ideally
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

const getWhenText = (eventTime: string | null) => {
  if (!eventTime) return "";
  const eventDate = new Date(eventTime);
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
};

// Memoized Event Card Component
const EventCard = React.memo(({ event, onPress, theme }: any) => {
  const isURL = event.EventImage && event.EventImage.startsWith("http");
  const imgSource = isURL ? { uri: event.EventImage } : gif_placeholder;
  const whenText = getWhenText(event.EventTime);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.eventCardNew, { backgroundColor: theme.bg7 }]}
      activeOpacity={0.85}
    >
      <Image 
        source={imgSource} 
        style={styles.eventImgNew}
        defaultSource={gif_placeholder}
        resizeMode="cover"
      />
      <View style={styles.eventInfo}>
        <Text style={styles.eventDate}>{whenText}</Text>
        <Text style={styles.eventTitleNew} numberOfLines={2}>
          {event.EventTitle}
        </Text>
        <View style={styles.eventLocationRow}>
          <Ionicons name="location-outline" size={14} color="#999" />
          <Text style={styles.eventLocationText}>{event._distText}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// Memoized Skeleton Component
const EventCardSkeleton = React.memo(({ theme }: { theme: any }) => {
  return (
    <View style={[styles.eventCardSkelton, { backgroundColor: theme.bg2 }]}>
      <View style={[styles.skelImg, { backgroundColor: theme.bg4 }]} />
      <View style={[styles.eventMeta, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
        <View style={[styles.skelLine, styles.skelLine1, { backgroundColor: theme.bg4 }]} />
        <View style={[styles.skelLine, styles.skelLine2, { backgroundColor: theme.bg4 }]} />
        <View style={[styles.skelLine, styles.skelLine3, { backgroundColor: theme.bg4 }]} />
      </View>
    </View>
  );
});

// Memoized Sponsored Card
const SponsoredCard = React.memo(({ item, theme }: any) => (
  <View style={[styles.eventCard, { backgroundColor: theme.bg2, marginRight: 14 }]}>
    <Image 
      source={{ uri: item.image }} 
      style={styles.eventImage} 
      resizeMode="cover"
    />
    <View style={styles.sponsoredBadge}>
      <Text style={styles.sponsoredText}>{item.type}</Text>
    </View>
    <View style={styles.eventMetaSponsored}>
      <Text style={styles.eventTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.sponsoredPublisher}>
        By {item.publisher}
      </Text>
    </View>
  </View>
));

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "dark";
  const theme = Colors[colorScheme];
  const { events, loading, refreshEvents } = useEvents();

  const [searchText, setSearchText] = useState("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Get location once
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
        setLocationEnabled(false);
      }
    })();
  }, []);

  const categories = ["Sports", "Dance", "Music", "Food"];

  // OPTIMIZED: Pre-calculate distances and sort once
  const enrichedEvents = useMemo(() => {
    if (!userCoords) return events.map(ev => ({ ...ev, _distance: 999999, _distText: "N/A" }));

    return events.map(ev => {
      const [lat, lon] = (ev.Location || "").split(",").map(Number);
      if (!lat || !lon) {
        return { ...ev, _distance: 999999, _distText: "N/A" };
      }

      const dist = parseFloat(calculateDistance(userCoords.lat, userCoords.lon, lat, lon));
      return {
        ...ev,
        _distance: dist,
        _distText: `${dist} km away`,
      };
    });
  }, [events, userCoords]);

  const sortedEvents = useMemo(() => {
    return [...enrichedEvents].sort((a, b) => a._distance - b._distance);
  }, [enrichedEvents]);

  // OPTIMIZED: Single filter pass
  const filteredEvents = useMemo(() => {
    let result = sortedEvents;

    if (selectedCategory) {
      result = result.filter(e => e.Category === selectedCategory);
    }

    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      result = result.filter(e => 
        (e.EventTitle || "").toLowerCase().includes(query)
      );
    }

    return result;
  }, [sortedEvents, searchText, selectedCategory]);

  // OPTIMIZED: Debounced search (only for dropdown)
  const searchResults = useMemo(() => {
    if (!searchText.trim()) return [];
    const query = searchText.toLowerCase();
    return enrichedEvents
      .filter(e => (e.EventTitle || "").toLowerCase().includes(query))
      .slice(0, 8);
  }, [searchText, enrichedEvents]);

  const highlight = useCallback((text: string, query: string) => {
    if (!query) return <Text style={styles.dropdownTitleText}>{text}</Text>;

    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        return (
          <Text key={i} style={styles.highlightText}>
            {part}
          </Text>
        );
      }
      return (
        <Text key={i} style={styles.dropdownTitleText}>
          {part}
        </Text>
      );
    });
  }, []);

  const handleRetryLocation = useCallback(async () => {
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
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedCategory(null);
    setSearchText("");
  }, []);

  const handleEventPress = useCallback((eventId: string) => {
    router.push(`/event_details?id=${eventId}`);
  }, [router]);

  // Render functions for FlatList
  const renderEventCard = useCallback(({ item }: any) => (
    <EventCard 
      event={item} 
      onPress={() => handleEventPress(item.EventID)}
      theme={theme}
    />
  ), [handleEventPress, theme]);

  const renderSkeleton = useCallback(({ item }: any) => (
    <EventCardSkeleton theme={theme} />
  ), [theme]);

  const renderSponsoredCard = useCallback(({ item }: any) => (
    <SponsoredCard item={item} theme={theme} />
  ), [theme]);

  const renderCategory = useCallback(({ item }: any) => {
    const active = selectedCategory === item;
    return (
      <TouchableOpacity
        onPress={() => setSelectedCategory(active ? null : item)}
        style={[
          styles.chip,
          {
            backgroundColor: active ? theme.bg7 : theme.bg4,
            borderColor: theme.bg4,
          },
        ]}
      >
        <Text style={[styles.chipText, { color: active ? theme.bg2 : "#bbbbbbc2" }]}>
          {item}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedCategory, theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg1 }]}>
      {!locationEnabled && (
        <View style={styles.locationOverlay}>
          <View style={[styles.locationBox, { backgroundColor: "#FBBF24" }]}>
            <Text style={styles.locationText}>Please enable location and retry</Text>
            <TouchableOpacity onPress={handleRetryLocation} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.main}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshEvents} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: theme.bg2 }]}>Upcoming</Text>
          <Text style={[styles.vibesText, { color: theme.bg6 }]}>VIBES</Text>
        </View>

        {/* Search field */}
        <View style={styles.searchWrap}>
          <Feather name="search" size={18} color={theme.bg2} style={styles.searchIcon} />
          <TextInput
            value={searchText}
            placeholder="Search Nearby Events"
            placeholderTextColor="#ffffffc2"
            onFocus={() => setShowSearchDropdown(true)}
            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
            onChangeText={setSearchText}
            style={[styles.searchInput, { backgroundColor: theme.bg4, color: "#fff" }]}
          />
        </View>

        {/* Search Dropdown */}
        {showSearchDropdown && searchText.trim().length > 0 && (
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
                    handleEventPress(item.EventID);
                  }}
                >
                  <Image 
                    source={{ uri: item.EventImage }} 
                    style={styles.dropdownImg}
                    defaultSource={gif_placeholder}
                    resizeMode="cover"
                  />
                  <Text style={styles.dropdownTitle} numberOfLines={2}>
                    {highlight(item.EventTitle, searchText)}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Events Horizontal List - Using FlatList */}
        <View style={styles.eventsSection}>
          {loading ? (
            <FlatList
              horizontal
              data={[1, 2, 3]}
              renderItem={renderSkeleton}
              keyExtractor={(item) => `skeleton-${item}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.flatListContent}
            />
          ) : filteredEvents.length > 0 ? (
            <FlatList
              horizontal
              data={filteredEvents}
              renderItem={renderEventCard}
              keyExtractor={(item) => item.EventID}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.flatListContent}
              initialNumToRender={3}
              maxToRenderPerBatch={5}
              windowSize={5}
              removeClippedSubviews={true}
            />
          ) : (
            <Text style={styles.emptyText}>No events found.</Text>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filtersSection}>
          <View style={styles.filtersHeader}>
            <Text style={styles.sectionLabel}>Filters</Text>
            {(selectedCategory || searchText) && (
              <TouchableOpacity onPress={clearFilters}>
                <Text style={styles.clearFilterText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            horizontal
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContent}
          />
        </View>

        {/* Sponsored Events - Using FlatList */}
        <View style={styles.sponsoredSection}>
          <View style={styles.filtersHeader}>
            <Text style={styles.sectionLabel}>Sponsored & Paid</Text>
          </View>

          <FlatList
            horizontal
            data={SPONSORED_EVENTS}
            renderItem={renderSponsoredCard}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sponsoredContent}
          />
        </View>

        {/* Tip Card */}
        <View style={[styles.tipCard, { backgroundColor: theme.bg4 }]}>
          <Text style={styles.tipText}>
            Tip: These sponsored and paid promotions may result in additional charges. Thank you!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  main: { padding: 16, paddingBottom: 140 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  headerTitle: { fontSize: 22, fontWeight: "600" },
  vibesText: { fontSize: 22, fontWeight: "700" },
  searchWrap: { marginTop: 15, position: "relative" },
  searchInput: {
    height: 46,
    borderRadius: 10,
    paddingLeft: 42,
    paddingVertical: 12,
    paddingRight: 16,
    borderWidth: 1,
    fontSize: 16,
  },
  searchIcon: { position: "absolute", left: 14, top: 14, zIndex: 10 },
  eventsSection: { marginTop: 5 },
  flatListContent: { paddingVertical: 8 },
  categoriesContent: { paddingRight: 8 },
  sponsoredContent: { paddingTop: 10 },
  eventCard: {
    width: Math.min(200, SCREEN_W * 0.56),
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
  },
  eventCardSkelton: {
    width: Math.min(200, SCREEN_W * 0.56),
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
  },
  eventImage: { width: "100%", height: "100%", position: "absolute" },
  skelImg: { width: "100%", height: "100%", position: "absolute" },
  eventMeta: { position: "absolute", bottom: 0, left: 0, width: "100%", padding: 10 },
  eventMetaSponsored: { 
    position: "absolute", 
    bottom: 0, 
    left: 0, 
    width: "100%", 
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.75)"
  },
  eventTitle: { color: "#fff", fontWeight: "700", fontSize: 18 },
  emptyText: { textAlign: "center", marginTop: 12, color: "#aaa" },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "white" },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
  },
  chipText: { fontWeight: "600" },
  skelLine: { height: 10, borderRadius: 6 },
  skelLine1: { width: "70%" },
  skelLine2: { width: "50%", marginTop: 6 },
  skelLine3: { width: "30%", marginTop: 6 },
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
  locationText: { color: "#000", fontWeight: "700", marginRight: 8 },
  retryBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#000", borderRadius: 8 },
  retryBtnText: { color: "#fff", fontWeight: "600" },
  filtersHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  filtersSection: { marginTop: 16 },
  sponsoredSection: { marginTop: 22 },
  clearFilterText: { color: "#bbbbbb7e", fontSize: 12, fontWeight: "600", padding: 4 },
  eventCardNew: {
    width: 250,
    height: 110,
    borderRadius: 18,
    flexDirection: "row",
    padding: 10,
    marginRight: 14,
    alignItems: "center",
  },
  eventImgNew: { width: 90, height: "100%", borderRadius: 14 },
  eventInfo: { flex: 1, marginLeft: 12, justifyContent: "center" },
  eventDate: { fontSize: 12, color: "#999", marginBottom: 4 },
  eventTitleNew: { fontSize: 15, fontWeight: "700", color: "#fff", marginBottom: 6 },
  eventLocationRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  eventLocationText: { color: "#aaa", marginLeft: 4, fontSize: 12 },
  tipCard: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 10,
  },
  tipText: { 
    fontSize: 12, 
    color: "#ffffff94", 
    textAlign: "left", 
    lineHeight: 16, 
    fontWeight: "500" 
  },
  dropdownBox: {
    width: "100%",
    marginTop: 6,
    borderRadius: 12,
    paddingVertical: 8,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: "#ffffff22",
  },
  dropdownRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: 8, 
    paddingHorizontal: 10 
  },
  dropdownImg: { width: 45, height: 45, borderRadius: 8, marginRight: 12 },
  dropdownTitle: { fontSize: 15, fontWeight: "600", flex: 1 },
  dropdownTitleText: { color: "#fff" },
  highlightText: { color: "#FFD54F", fontWeight: "700" },
  noResults: { textAlign: "center", color: "#aaaaaa", padding: 10 },
  sponsoredBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#FACC15",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  sponsoredText: { color: "#000", fontSize: 10, fontWeight: "700" },
  sponsoredPublisher: { color: "#ffffffb5", fontSize: 11, marginTop: 4 },
});