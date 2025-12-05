// app/(tabs)/create-event.tsx

import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { core_services } from "@/services/api";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from "react-native";

const suggestedTitles = ["Turf Cricket", "Garba Night", "House Party", "Birthday Bash", "Corporate Meetup"];

export default function CreateEventScreen() {
  const colorScheme = useColorScheme() ?? "dark";
  const theme = Colors[colorScheme];

  const { user }:any = useAuth();

  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [numTickets, setNumTickets] = useState(10);
  const [directJoin, setDirectJoin] = useState(true);
  const [eventCategory, setEventCategory] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [locationStr, setLocationStr] = useState("");

  const [categories, setCategories] = useState([]);

  // Fetch categories
  useEffect(() => {
    const load = async () => {
      try {
        const res = await core_services.getCategories();
        setCategories(res || []);
      } catch (err) {
        console.log("Category fetch failed", err);
      }
    };
    load();
  }, []);

  // Auto fetch location
  useEffect(() => {
    fetchLocationAuto();
  }, []);

  const fetchLocationAuto = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Location Required", "Enable location to create event.");
      return;
    }

    const pos = await Location.getCurrentPositionAsync({});
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    setLocationStr(`${lat}, ${lng}`);
  };

  const handleCreateEvent = async () => {
    if (!eventTitle || !eventDesc || !eventCategory || !eventDate || !eventTime) {
      Alert.alert("Required", "Please fill all required fields.");
      return;
    }

    if (!locationStr) {
      Alert.alert("Error", "Unable to fetch GPS location. Try again.");
      return;
    }

    const eventDateTime = new Date(`${eventDate}T${eventTime}:00Z`).toISOString();

    const payload = {
      eventTitle,
      eventDesc,
      categoryId: eventCategory,
      location: locationStr,
      userId: user?.userId || "UNKNOWN_USER",
      eventTime: eventDateTime,
      directJoin,
      numTickets,
    };

    try {
      await core_services.createEvent(payload);
      Alert.alert("Success", "Event created successfully.");
    } catch (err) {
      Alert.alert("Error", "Failed creating event.");
    }
  };

  return (
    <ScrollView style={[styles.wrap, { backgroundColor: theme.bg1 }]}>
      <Text style={[styles.heading, { color: theme.bg6 }]}>Create Event</Text>

      {/* Title */}
      <Text style={[styles.label, { color: theme.bg6 }]}>Event Title</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.bg3, color: theme.bg2 }]}
        placeholder="Enter title"
        placeholderTextColor="#999"
        value={eventTitle}
        onChangeText={setEventTitle}
        maxLength={50}
      />

      <View style={styles.suggestions}>
        {suggestedTitles.map((t) => (
          <TouchableOpacity key={t} onPress={() => setEventTitle(t)}>
            <Text style={[styles.chip, { backgroundColor: theme.bg6, color: theme.bg1 }]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Description */}
      <Text style={[styles.label, { color: theme.bg6 }]}>Event Description</Text>
      <TextInput
        style={[styles.textarea, { backgroundColor: theme.bg3, color: theme.bg2 }]}
        placeholder="Enter description"
        placeholderTextColor="#999"
        value={eventDesc}
        onChangeText={setEventDesc}
        maxLength={80}
        multiline
      />

      {/* Category */}
      <Text style={[styles.label, { color: theme.bg6 }]}>Select Category</Text>
      <View style={[styles.pickerContainer, { backgroundColor: theme.bg3 }]}>
        <ScrollView>
          {categories.map((cat: any) => (
            <TouchableOpacity
              key={cat.CategoryId}
              onPress={() => setEventCategory(cat.CategoryId)}
            >
              <Text
                style={[
                  styles.pickerItem,
                  { color: eventCategory === cat.CategoryId ? theme.bg6 : theme.bg2 },
                ]}
              >
                {cat.CategoryName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Date */}
      <Text style={[styles.label, { color: theme.bg6 }]}>Event Date</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.bg3, color: theme.bg2 }]}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#999"
        value={eventDate}
        onChangeText={setEventDate}
      />

      {/* Time */}
      <Text style={[styles.label, { color: theme.bg6 }]}>Event Time</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.bg3, color: theme.bg2 }]}
        placeholder="HH:MM"
        placeholderTextColor="#999"
        value={eventTime}
        onChangeText={setEventTime}
      />

      {/* Tickets */}
      <Text style={[styles.label, { color: theme.bg6 }]}>Number of Tickets</Text>
      <View style={styles.ticketRow}>
        <TouchableOpacity
          style={[styles.ticketBtn, { backgroundColor: theme.bg3 }]}
          onPress={() => setNumTickets((p) => Math.max(1, p - 1))}
        >
          <Text style={{ color: theme.bg6 }}>-</Text>
        </TouchableOpacity>

        <Text style={[styles.ticketCount, { color: theme.bg6 }]}>{numTickets}</Text>

        <TouchableOpacity
          style={[styles.ticketBtn, { backgroundColor: theme.bg3 }]}
          onPress={() => setNumTickets((p) => p + 1)}
        >
          <Text style={{ color: theme.bg6 }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Direct Join Switch */}
      <Text style={[styles.label, { color: theme.bg6 }]}>Direct Join</Text>
      <Switch
        value={directJoin}
        onValueChange={setDirectJoin}
        thumbColor={theme.bg6}
        trackColor={{ true: theme.bg7, false: "#666" }}
      />

      {/* Create Button */}
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: theme.bg6 }]}
        onPress={handleCreateEvent}
      >
        <Text style={[styles.createBtnText, { color: theme.bg1 }]}>Create Event</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  textarea: {
    borderRadius: 10,
    padding: 14,
    minHeight: 80,
  },
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "500",
  },
  pickerContainer: {
    borderRadius: 10,
    maxHeight: 140,
    padding: 10,
  },
  pickerItem: {
    paddingVertical: 8,
    fontSize: 14,
  },
  ticketRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  ticketBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  ticketCount: {
    width: 50,
    textAlign: "center",
    fontSize: 16,
  },
  createBtn: {
    marginTop: 30,
    height: 48,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
