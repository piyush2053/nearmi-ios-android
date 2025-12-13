import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { core_services } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";

export default function EventDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const eventId = params.id as string;
  const { user }: any = useAuth();
  const theme = Colors["dark"]; // fixed dark mode (your app default)
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
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

    loadEventDetails();
  }, []);

  useEffect(() => {
    loadEventDetails();
  }, []);
  const calculateDistance = (lat1: any, lon1: any, lat2: any, lon2: any) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1); // km
  };

  const loadEventDetails = async () => {
    try {
      const data = await core_services.getEventById(eventId);

      setEvent({
        id: data.EventID,
        title: data.EventTitle,
        description: data.EventDesc,
        location: data.Location,
        date: new Date(data.EventTime).toDateString(),
        time: new Date(data.EventTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        img:
          "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7",
      });

      // Fetch attendees
      const people = await core_services.getEventAttendees(eventId);
      setAttendees(people);

      const joined = people.some((p: any) => p.UserId === user.id);
      setAlreadyJoined(joined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const userId = user?.id
    try {
      await core_services.addEventAttender({
        eventId,
        userId,
      });

      setAlreadyJoined(true);
      setAttendees((prev) => [...prev, { EventID: eventId, UserId: userId }]);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={theme.bg6} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.loaderWrap}>
        <Text style={{ color: "#fff" }}>Event not found</Text>
      </View>
    );
  }
  const [eventLat, eventLon] = event.location
    ? event.location.split(",").map(Number)
    : [null, null];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg1 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HERO IMAGE */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: event.img }} style={styles.heroImg} />
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.8}
            style={styles.backBtnWrap}
          >
            <BlurView intensity={25} tint="dark" style={styles.backBtnGlass}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </BlurView>
          </TouchableOpacity>


          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>{event.title}</Text>
          </View>
        </View>

        {/* INFO CARDS */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Ionicons name="calendar" size={18} color={theme.bg2} />
            <Text style={styles.infoText}>{event.date}</Text>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="time" size={18} color={theme.bg2} />
            <Text style={styles.infoText}>{event.time}</Text>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="location" size={18} color={theme.bg2} />
            <Text style={styles.infoText}>
              {eventLat && eventLon && userCoords
                ? `${calculateDistance(
                  userCoords.lat,
                  userCoords.lon,
                  eventLat,
                  eventLon
                )} km`
                : "N/A"}
            </Text>
          </View>
        </View>

        {/* ABOUT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Event</Text>
          <Text style={styles.desc}>{event.description}</Text>
        </View>

        {/* ATTENDEES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendees</Text>
          <Text style={styles.desc}>
            {attendees.length} people already joined
          </Text>
        </View>

        {/* SPACING for bottom bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* BOTTOM ACTION BAR (BUY / JOIN STYLE) */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={{ color: "#aaa", fontSize: 12 }}>Event Access</Text>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
            Free Entry
          </Text>
        </View>

        <TouchableOpacity
          disabled={alreadyJoined}
          onPress={alreadyJoined ? undefined : handleJoin}
          style={[
            styles.actionBtn,
            { backgroundColor: alreadyJoined ? "#444" : theme.bg6 },
          ]}
        >
          <Text style={{ color: theme.bg1, fontWeight: "700" }}>
            {alreadyJoined ? "Joined" : "Join Event"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    backgroundColor: "#081638",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
  },
  imageWrap: {
    position: "relative",
    height: 260,
  },
  banner: {
    width: "100%",
    height: "100%",
  },
  backBtn: {
    position: "absolute",
    top: 40,
    left: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  titleWrap: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  content: {
    padding: 16,
  },
  meta: {
    color: "#ddd",
    marginBottom: 4,
  },
  joinWrap: {
    padding: 16,
    paddingBottom: 40,
  },
  joinBtn: {
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  heroWrap: {
    height: 300,
    position: "relative",
  },
  heroImg: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    gap: 8,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#29caff39",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "700",
    marginBottom: 6,
  },
  desc: {
    color: "#ccc",
    lineHeight: 20,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0B1220",
    borderTopWidth: 1,
    borderTopColor: "#ffffff10",
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 20,
  },

  backBtnGlass: {
    width: 48,
    height: 48,
    borderTopRightRadius: 35,
    borderBottomRightRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },

});
