// app/(tabs)/create-event.tsx
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { core_services } from "@/services/api";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
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

  const { user }: any = useAuth();

  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [numTickets, setNumTickets] = useState(10);
  const [directJoin, setDirectJoin] = useState(true);
  const [eventCategory, setEventCategory] = useState("");
  const [locationStr, setLocationStr] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<Date | null>(null);
  const router = useRouter();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
useEffect(() => {
  Notifications.requestPermissionsAsync();
}, []);


  // Category Dropdown
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

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
 const triggerSuccessNotification = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Event Created",
      body: "Your event has been created successfully.",
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null, // fire immediately
  });
};


  const handleCreateEvent = async () => {
    if (!eventTitle || !eventDesc || !eventCategory || !date || !time) {
      Alert.alert("Required", "Please fill all required fields.");
      return;
    }

    if (!locationStr) {
      Alert.alert("Error", "Unable to fetch GPS location. Try again.");
      return;
    }

    const mergedDateTime = new Date(date);
    mergedDateTime.setHours(time.getHours());
    mergedDateTime.setMinutes(time.getMinutes());

    const eventDateTime = mergedDateTime.toISOString();

    const payload = {
      eventTitle,
      eventDesc,
      categoryId: eventCategory,
      location: locationStr,
      userId: user?.id || "UNKNOWN_USER",
      eventTime: eventDateTime,
      directJoin,
      numTickets,
    };

    try {
      await core_services.createEvent(payload);
      await triggerSuccessNotification();
      router.replace("/");
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

      {/* Category Dropdown */}
      <Text style={[styles.label, { color: theme.bg6 }]}>Select Category</Text>

      <TouchableOpacity
        onPress={() => setCategoryModalVisible(true)}
        style={[styles.input, { backgroundColor: theme.bg3, justifyContent: "center" }]}
      >
        <Text style={{ color: eventCategory ? theme.bg6 : "#999" }}>
          {eventCategory ? categories?.find((c: any) => c.CategoryId === eventCategory)?.CategoryName : "Select Category"}
        </Text>
      </TouchableOpacity>

      {/* Category Modal */}
      <Modal visible={categoryModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.bg2 }]}>

            {/* None Option */}
            <TouchableOpacity
              onPress={() => {
                setEventCategory("");
                setCategoryModalVisible(false);
              }}
            >
              <Text style={[styles.modalItem, { color: theme.bg1 }]}>None</Text>
            </TouchableOpacity>

            {categories?.map((cat: any) => (
              <TouchableOpacity
                key={cat.CategoryId}
                onPress={() => {
                  setEventCategory(cat.CategoryId);
                  setCategoryModalVisible(false);
                }}
              >
                <Text style={[styles.modalItem, { color: theme.bg1 }]}>
                  {cat.CategoryName}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity onPress={() => setCategoryModalVisible(false)}>
              <Text style={[styles.modalClose, { color: theme.bg6 }]}>Close</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      <Text style={[styles.label, { color: theme.bg6 }]}>Event Date</Text>
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={[styles.input, { backgroundColor: theme.bg3, justifyContent: "center" }]}
      >
        <Text style={{ color: date ? theme.bg6 : "#999" }}>
          {date ? date.toDateString() : "Pick a Date"}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={date || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(e: any, value: any) => {
            setShowDatePicker(false);
            if (value) setDate(value);
          }}
        />
      )}

      {/* Time Picker */}
      <Text style={[styles.label, { color: theme.bg6 }]}>Event Time</Text>
      <TouchableOpacity
        onPress={() => setShowTimePicker(true)}
        style={[styles.input, { backgroundColor: theme.bg3, justifyContent: "center" }]}
      >
        <Text style={{ color: time ? theme.bg6 : "#999" }}>
          {time ? time.toLocaleTimeString().slice(0, 5) : "Pick Time"}
        </Text>
      </TouchableOpacity>

      {showTimePicker && (
        <DateTimePicker
          value={time || new Date()}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(e, value) => {
            setShowTimePicker(false);
            if (value) setTime(value);
          }}
        />
      )}

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

      {/* Direct Join Checkbox */}
      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => setDirectJoin(!directJoin)}
      >
        <View
          style={[
            styles.checkboxBox,
            {
              borderColor: theme.bg6,
              backgroundColor: directJoin ? "transparent" : theme.bg6,
            },
          ]}
        />
        <Text style={[styles.checkboxLabel, { color: theme.bg6 }]}>
          Ask to Join
        </Text>
      </TouchableOpacity>

      {/* Create Event Button */}
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
  wrap: { flex: 1, padding: 16 },
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 20 },
  label: { fontSize: 14, marginBottom: 6, marginTop: 14 },
  input: { height: 48, borderRadius: 10, paddingHorizontal: 14 },
  textarea: { borderRadius: 10, padding: 14, minHeight: 80 },
  suggestions: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "500",
  },
  ticketRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  ticketBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  ticketCount: { width: 50, textAlign: "center", fontSize: 16 },
  checkboxRow: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  checkboxBox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 6,
    marginRight: 10,
  },
  checkboxLabel: { fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 30,
  },
  modalBox: {
    borderRadius: 12,
    padding: 16,
  },
  modalItem: {
    paddingVertical: 10,
    fontSize: 16,
  },
  modalClose: {
    textAlign: "center",
    marginTop: 14,
    fontSize: 16,
  },
  createBtn: {
    marginTop: 30,
    height: 48,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  createBtnText: { fontSize: 16, fontWeight: "700" },
});
