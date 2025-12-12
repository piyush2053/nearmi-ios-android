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
          "https://canapii.com/wp-content/uploads/2023/03/Blog-banner-5-C-of-event-management.png",
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
    <ScrollView style={[styles.container, { backgroundColor: theme.bg1 }]}>
      {/* IMAGE HEADER */}
      <View style={styles.imageWrap}>
        <Image source={{ uri: event.img }} style={styles.banner} />

        {/* back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
          <Text style={{ color: "#fff", marginLeft: 4 }}>Back</Text>
        </TouchableOpacity>

        <View style={styles.titleWrap}>
          <Text style={styles.title}>{event.title}</Text>
        </View>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        <Text style={styles.meta}>📅 {event.date}</Text>
        <Text style={styles.meta}>🕒 {event.time}</Text>
        <Text style={styles.meta}>
          <Ionicons size={20} name="location" />{" "}
          {eventLat && eventLon
            ? `${userCoords && eventLat && eventLon
              ? `${calculateDistance(userCoords.lat, userCoords.lon, eventLat, eventLon)} km away`
              : "Calculating distance..."
            }`
            : "Location unavailable"}
        </Text>


        <Text style={styles.sectionTitle}>About Event</Text>
        <Text style={styles.desc}>{event.description}</Text>
      </View>

      {/* JOIN BUTTON */}
      <View style={styles.joinWrap}>
        <TouchableOpacity
          disabled={alreadyJoined}
          onPress={alreadyJoined ? undefined : handleJoin}
          style={[
            styles.joinBtn,
            { backgroundColor: alreadyJoined ? "#555" : "#29C9FF" },
          ]}
        >
          <Text style={{ color: "#000", fontWeight: "700" }}>
            {alreadyJoined ? "Already Joined" : "Request to Join Event"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  sectionTitle: {
    marginTop: 16,
    fontSize: 18,
    color: "#fff",
    fontWeight: "700",
  },
  desc: {
    color: "#ccc",
    marginTop: 6,
    lineHeight: 20,
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
});
