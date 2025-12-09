// app/(tabs)/messages/[eventId].tsx
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { core_services } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList, Image, KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export default function MessagesChatScreen() {
  const params = useLocalSearchParams() as any;
  const eventId = params.eventId;
  const router = useRouter();
  const { user }: any = useAuth();
  const colorScheme = "dark";
  const theme = Colors[colorScheme];
  const [polling, setPolling] = useState(false);
  const [pollError, setPollError] = useState(false);
  const [eventData, setEventData] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const flatRef = useRef<FlatList | null>(null);
  const pollRef = useRef<any>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      // event details
      const ev = await core_services.getEventById(eventId);
      setEventData(ev);

      // attendees (optional)
      const attendees = await core_services.getEventAttendees(eventId).catch(() => []);
      // messages
      const msgRes: any[] = (await core_services.getMessagesByEvent(eventId)) || [];
      const formatted = msgRes.map((m) => ({
        id:
          m.MessageID ||
          m.id ||
          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        userId: m.UserId,
        text: m.MessageText,
        time: m.CreatedAt,
      }));

      setMessages(formatted);

      // mark lastSeen now (so unread resets)
      await AsyncStorage.setItem(`lastSeen:${eventId}`, new Date().toISOString());
    } catch (err) {
      console.warn("chat load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();

    pollRef.current = setInterval(async () => {
      try {
        setPolling(true);
        setPollError(false);

        const msgRes: any[] = (await core_services.getMessagesByEvent(eventId)) || [];
        const formatted = msgRes.map((m) => ({
          id:
            m.MessageID ||
            m.id ||
            `${Date.now()}-${Math.random().toString(36).slice(2)}`, // UNIQUE fallback
          userId: m.UserId,
          text: m.MessageText,
          time: m.CreatedAt,
        }));

        setMessages(formatted);
      } catch (e) {
        setPollError(true);
      } finally {
        setPolling(false);
      }
    }, 5000);

    return () => clearInterval(pollRef.current);
  }, [eventId]);


  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await core_services.createMessage({
        eventId,
        userId: user?.userId || user?.id,
        messageText: newMessage.trim(),
      });

      // optimistic update
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          userId: user?.userId || user?.id,
          text: newMessage.trim(),
          time: new Date().toISOString(),
        },
      ]);
      setNewMessage("");

      // scroll to bottom
      setTimeout(() => flatRef.current?.scrollToEnd?.(), 200);
      // set lastSeen
      await AsyncStorage.setItem(`lastSeen:${eventId}`, new Date().toISOString());
    } catch (err) {
      console.warn("send error:", err);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const mine = item.userId === (user?.userId || user?.id);

    // Previous message date
    const prev = messages[index - 1];
    const showDate =
      index === 0 ||
      format(new Date(prev.time), "yyyy-MM-dd") !== format(new Date(item.time), "yyyy-MM-dd");

    return (
      <>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>{getDayLabel(item.time)}</Text>
          </View>
        )}

        <View
          style={{
            marginVertical: 6,
            alignSelf: mine ? "flex-end" : "flex-start",
            maxWidth: "82%",
            paddingHorizontal: 4,
          }}
        >
          <View
            style={[
              styles.bubble,
              mine
                ? { backgroundColor: theme.bg6, alignSelf: "flex-end" }
                : { backgroundColor: theme.bg4, alignSelf: "flex-start" },
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                { color: mine ? "#081638" : "#fff" }
              ]}
            >
              {item.text}
            </Text>
          </View>

          <Text
            style={[
              styles.timeText,
              { textAlign: mine ? "right" : "left" }
            ]}
          >
            {format(new Date(item.time), "hh:mm aa")}
          </Text>
        </View>
      </>
    );
  };


  if (loading) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: theme.bg1 }]}>
        <ActivityIndicator size="large" color={theme.bg6} />
      </View>
    );
  }

  if (!eventData) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: theme.bg1 }]}>
        <Text style={{ color: "#fff" }}>Event not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.bg6, marginTop: 8 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isAdmin = eventData.UserId === (user?.userId || user?.id);
  const getDayLabel = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";

    return format(date, "dd MMM yyyy");
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 135 : 0}
      >
        <View style={[styles.header, { backgroundColor: theme.bg1 }]}>
          <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 10 }}>
            <Ionicons name="arrow-back" size={22} color={theme.bg2} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Image
              source={{ uri: "https://cdn-icons-png.flaticon.com/512/12886/12886428.png" }}
              style={styles.headerAvatar}
            />

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={[styles.headerTitle, { color: theme.bg2 }]} numberOfLines={1}>
                {eventData.EventTitle}
              </Text>

              {/* Small loader when polling */}
              {polling && (
                <ActivityIndicator
                  size="small"
                  color={theme.bg6}
                  style={{ marginLeft: 8, transform: [{ scale: 0.7 }] }}
                />
              )}

              {/* Warning icon on error */}
              {pollError && (
                <TouchableOpacity
                  onPress={() => alert("Something went wrong while fetching messages.")}
                  style={{ marginLeft: 8 }}
                >
                  <Ionicons name="warning-outline" size={18} color="orange" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Placeholder to balance layout */}
          <View style={{ width: 32 }} />
        </View>

        {/* Messages */}
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m, index) => m.id?.toString() ?? `msg-${index}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"

        />

        {/* Input area */}
        <View style={[styles.inputWrap, { backgroundColor: theme.bg1 }]}>
          {isAdmin ? (
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
              <TextInput
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor="#aaa"
                style={[styles.input, { backgroundColor: theme.bg4, color: theme.bg2 }]}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />

              <TouchableOpacity onPress={handleSend} style={[styles.sendBtn, { backgroundColor: theme.bg6 }]} disabled={sending}>
                {sending ? <ActivityIndicator color={theme.bg1} /> : <Ionicons name="send" size={18} color={theme.bg1} />}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ padding: 12 }}>
              <Text style={{ color: "#bbb", textAlign: "center" }}>Only admin can send messages.</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { flex: 1 },

  header: {
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  inputWrap: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderTopWidth: 0,
    backgroundColor: "#020a1eff",
  }
  ,
  input: {
    flex: 1,
    height: 46,
    borderRadius: 24,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Cereal-Regular",
  },

  sendBtn: {
    marginLeft: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    backgroundColor: "#444",
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    fontFamily: "Cereal-Regular",
  },

  bubbleText: {
    fontSize: 15,
    fontFamily: "Cereal-Regular",
  },

  timeText: {
    fontSize: 11,
    color: "#bbb",
    marginTop: 4,
    fontFamily: "Cereal-Light",
  },

  headerTitle: {
    fontSize: 18,
    fontFamily: "Cereal-Medium",
    fontWeight: "600",
  },
  dateSeparator: {
    alignSelf: "center",
    backgroundColor: "#1f2a40",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    marginVertical: 3,
  },

  dateSeparatorText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Cereal-Regular",
  },

});
