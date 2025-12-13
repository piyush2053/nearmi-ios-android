import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { core_services } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from "react-native";

const suggestedTitles = [
  "Turf Cricket",
  "Garba Night",
  "House Party",
  "Birthday Bash",
  "Corporate Meetup",
];

export default function CreateEventScreen() {
  const colorScheme = useColorScheme() ?? "dark";
  const theme = Colors[colorScheme];
  const { user }: any = useAuth();
  const router = useRouter();

  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [numTickets, setNumTickets] = useState(10);
  const [directJoin, setDirectJoin] = useState(true);
  const [eventCategory, setEventCategory] = useState("");
  const [locationStr, setLocationStr] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<Date | null>(null);

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const bannerPlaceholder =
    "https://static.toiimg.com/thumb/msid-119900061,width-1280,height-720,resizemode-4/119900061.jpg";

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  useEffect(() => {
    loadCategories();
    autoLocation();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await core_services.getCategories();
      setCategories(res || []);
    } catch { }
  };

  const autoLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    const pos = await Location.getCurrentPositionAsync({});
    setLocationStr(`${pos.coords.latitude}, ${pos.coords.longitude}`);
  };

  const triggerSuccess = () => {
    Notifications.scheduleNotificationAsync({
      content: {
        title: "Event Created",
        body: "Your event has been created successfully.",
      },
      trigger: null,
    });
  };

  const handleCreate = async () => {
    if (!eventTitle || !eventDesc || !eventCategory || !date || !time)
      return Alert.alert("Required", "Please fill all required fields.");

    const merged = new Date(date);
    merged.setHours(time.getHours());
    merged.setMinutes(time.getMinutes());

    const payload = {
      eventTitle,
      eventDesc,
      categoryId: eventCategory,
      location: locationStr,
      userId: user?.id,
      eventTime: merged.toISOString(),
      directJoin,
      numTickets,
    };

    try {
      await core_services.createEvent(payload);
      triggerSuccess();
      router.replace("/");
    } catch (err) {
      Alert.alert("Error", "Failed creating event.");
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg1 }}
      contentContainerStyle={{ paddingBottom: 80 }}
    >

      {/* ------------------ BANNER ------------------ */}
      <View style={styles.headerImgWrap}>
        <Image
          source={{ uri: bannerPlaceholder }}
          style={styles.headerImg}
        />

        {/* Glass Back Button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <View style={styles.backGlass}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* ------------------ CARD ------------------ */}
      <View style={[styles.card, { backgroundColor: theme.bg1 }]}>

        {/* Event Title */}
        <Text style={styles.label}>Event Title</Text>
        <TextInput
          style={[styles.inputLine, { color: theme.bg6 }]}
          placeholder="Music Concert"
          placeholderTextColor="#999"
          value={eventTitle}
          onChangeText={setEventTitle}
        />
        <View style={styles.divider} />

        {/* Suggestions */}
        <View style={styles.suggestionRow}>
          {suggestedTitles.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setEventTitle(t)}
              style={[styles.suggestionChip, { backgroundColor: theme.bg6 }]}
            >
              <Text style={{ color: theme.bg1 }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date + Time */}
        <Text style={styles.label}>Date & Time</Text>
        <View style={styles.row}>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={[styles.pillSmall, { backgroundColor: theme.bg1 }]}
          >
            <Ionicons name="calendar-outline" size={16} color="#aaa" />
            <Text style={styles.pillText}>
              {date ? date.toDateString() : "Pick date"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowTimePicker(true)}
            style={[styles.pillSmall, { backgroundColor: theme.bg1 }]}
          >
            <Ionicons name="time-outline" size={16} color="#aaa" />
            <Text style={styles.pillText}>
              {time
                ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Pick time"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <Text style={styles.label}>Additional Information</Text>
        <TextInput
          style={[styles.textAreaLine, { color: theme.bg6 }]}
          multiline
          placeholder="Tell more about your event..."
          placeholderTextColor="#999"
          value={eventDesc}
          onChangeText={setEventDesc}
        />
        <View style={styles.divider} />

        {/* Category */}
        <Text style={styles.label}>Category</Text>
        <TouchableOpacity onPress={() => setCategoryModalVisible(true)} style={styles.inputLine}>
          <Text style={{ color: theme.bg6 }}>
            {eventCategory
              ? categories.find((c) => c.CategoryId === eventCategory)?.CategoryName
              : "Select Category"}
          </Text>
        </TouchableOpacity>
        <View style={styles.divider} />

        {/* Number of Attendees */}
        <Text style={styles.label}>Number of Attendees</Text>
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

        {/* Request to Join Toggle */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setDirectJoin(!directJoin)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.checkboxBox,
              {
                borderColor: theme.bg6,
                backgroundColor: directJoin ? theme.bg6 : "transparent",
              },
            ]}
          >
            {directJoin && (
              <Ionicons name="checkmark" size={14} color={theme.bg1} />
            )}
          </View>

          <Text style={[styles.checkboxLabel, { color: theme.bg6 }]}>
            Ask to Join
          </Text>
        </TouchableOpacity>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: theme.bg6 }]}
          onPress={handleCreate}
        >
          <Text style={{ color: theme.bg1, fontWeight: "700", fontSize: 16 }}>
            Create Event
          </Text>
        </TouchableOpacity>

      </View>

    </ScrollView>
  );

}

const styles = StyleSheet.create({
  headerImgWrap: {
    height: 180,
    position: "relative",
    margin: 10
  },
  headerImg: {
    width: "100%",
    height: "100%",
    borderRadius: 30,
  },
  backBtn: {
    position: "absolute",
    top: 10,
    left: 20,
  },
  backGlass: {
    padding: 10,
    borderRadius: 50,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  card: {
    borderRadius: 20,
    padding: 10,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  inputLine: {
    paddingVertical: 10,
    fontSize: 16,
  },

  divider: {
    height: 1,
    backgroundColor: "#ffffff22",
    marginBottom: 10,
  },

  textAreaLine: {
    minHeight: 60,
    fontSize: 15,
    paddingVertical: 10,
  },

  pillSmall: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    flex: 1,
    marginRight: 10,
  },

  pillText: {
    color: "#aaa",
    marginLeft: 6,
  },

  row: {
    flexDirection: "row",
    marginBottom: 10,
  },

  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },

  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },

  inviteCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#444",
    marginRight: 8,
  },

  inviteAdd: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },

  createBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
  },



  label: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 6,
    marginTop: 14,
  },

  input: {
    height: 46,
    borderRadius: 10,
    paddingHorizontal: 12,
  },

  textArea: {
    minHeight: 90,
    borderRadius: 12,
    padding: 12,
  },

  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },

  col: {
    width: "48%",
  },

  pillBtn: {
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  ticketRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingHorizontal: 4,
  },

  ticketBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E1E1E55", // subtle dark pill
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  ticketCount: {
    fontSize: 18,
    fontWeight: "700",
    width: 55,
    textAlign: "center",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },

  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  checkboxLabel: {
    fontSize: 15,
    fontWeight: "600",
  },


});
