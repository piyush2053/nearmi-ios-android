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
        id: m.MessageID || m.id || Math.random().toString(),
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

    // polling every 5s
    pollRef.current = setInterval(async () => {
      try {
        const msgRes: any[] = (await core_services.getMessagesByEvent(eventId)) || [];
        const formatted = msgRes.map((m) => ({
          id: m.MessageID || m.id || Math.random().toString(),
          userId: m.UserId,
          text: m.MessageText,
          time: m.CreatedAt,
        }));
        setMessages(formatted);
      } catch (e) {
        // ignore
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
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
          id: Math.random().toString(),
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

  const renderItem = ({ item }: { item: any }) => {
    const isAdmin = item.userId === eventData?.UserId;
    const mine = item.userId === (user?.userId || user?.id);
    return (
      <View style={{ marginVertical: 6, alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%" }}>
        <View
          style={[
            styles.bubble,
            mine ? { backgroundColor: theme.bg6, alignSelf: "flex-end" } : { backgroundColor: theme.bg4, alignSelf: "flex-start" },
          ]}
        >
          <Text style={{ color: mine ? "#081638" : "#fff" }}>{item.text}</Text>
        </View>
        <Text style={{ fontSize: 11, color: "#bbb", marginTop: 4, textAlign: mine ? "right" : "left" }}>
          {format(new Date(item.time), "hh:mm aa")}
        </Text>
      </View>
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

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.bg1 }]} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={80}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.bg1 }]}>

        {/* Back Button */}
        <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 10 }}>
          <Ionicons name="arrow-back" size={22} color={theme.bg2} />
        </TouchableOpacity>

        {/* Group Icon + Title */}
        <View style={styles.headerInfo}>
          <Image
            source={{ uri: "https://cdn-icons-png.flaticon.com/512/12886/12886428.png" }}
            style={styles.headerAvatar}
          />

          <Text style={[styles.headerTitle, { color: theme.bg2 }]} numberOfLines={1}>
            {eventData.EventTitle}
          </Text>
        </View>

        {/* Placeholder to balance layout */}
        <View style={{ width: 32 }} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
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
  headerTitle: { fontSize: 18, fontWeight: "700" },

  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
  },

  inputWrap: {
    padding: 12,
    marginBottom: 20,
    borderTopWidth: 0,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    paddingHorizontal: 14,
    fontSize: 14,
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

});
