// app/(tabs)/messages/index.tsx
import DeleteConfirm from "@/components/DeleteConfirm";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { core_services } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type EventItem = any;

// Memoized Message Item Component
const MessageItem = React.memo(
  ({
    item,
    theme,
    activeItem,
    onPress,
    onLongPress,
    onDelete,
    onCancel,
  }: any) => {
    const { event, lastMessage, unreadCount, isAdmin } = item;
    const title = event.EventTitle || event.title || "Untitled";
    const subtitle = lastMessage?.text ?? event.EventDesc ?? "";
    const time = lastMessage?.time
      ? format(new Date(lastMessage.time), "hh:mm aa")
      : "";
    const eventId = String(event.EventID || event.id);
    const isActive = activeItem === eventId;

    return (
      <TouchableOpacity
        style={[
          styles.row,
          {
            backgroundColor: isActive ? theme.bg7 : theme.bg1,
            borderBottomWidth: 0.4,
            borderBottomColor: "#444",
          },
        ]}
        onPress={onPress}
        onLongPress={isAdmin ? onLongPress : undefined}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: theme.bg6 }]}>
          <Text style={styles.avatarText}>
            {(title || "E").charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.meta}>
          <View style={styles.rowTop}>
            <Text style={[styles.title, { color: theme.bg2 }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.time}>{time}</Text>
          </View>

          <View style={styles.rowBottom}>
            <Text style={styles.preview} numberOfLines={1}>
              {subtitle}
            </Text>

            <View style={styles.badgeRow}>
              {isAdmin && !isActive && (
                <View style={[styles.adminBadge, { borderColor: theme.bg6 }]}>
                  <Text style={[styles.adminText, { color: theme.bg6 }]}>
                    ADMIN
                  </Text>
                </View>
              )}

              {unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: theme.bg6 }]}>
                  <Text style={styles.unreadText}>{unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {isActive && (
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={onDelete}
            >
              <Ionicons name="trash" size={21} color="#fff" />
            </TouchableOpacity>

            <View style={[styles.actionBtn, styles.disabledBtn]}>
              <Ionicons name="create" size={21} color="#fff" />
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, styles.disabledBtn]}
              onPress={onCancel}
            >
              <Ionicons name="ban" size={21} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  },
  (prev, next) =>
    prev.item.event.EventID === next.item.event.EventID &&
    prev.activeItem === next.activeItem &&
    prev.item.unreadCount === next.item.unreadCount
);

export default function MessagesWrapper() {
  const router = useRouter();
  const { user }: any = useAuth();
  const colorScheme = "dark";
  const theme = Colors[colorScheme];

  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<
    {
      event: EventItem;
      lastMessage?: any;
      unreadCount: number;
      isAdmin: boolean;
    }[]
  >([]);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    try {
      await core_services.deleteEvent(eventId);
      setItems((prev) => prev.filter((it) => String(it.event.EventID || it.event.id) !== eventId));

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Group Deleted",
          body: "The event and chat have been removed successfully.",
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    } catch (error) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Delete Failed",
          body: "Unable to delete the group. Please try again.",
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });
    }
  }, []);

  const loadList = useCallback(async () => {
    if (!user?.id && !user?.userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const userId = user.userId || user.id;
      
      // Fetch all events
      const allEvents: any[] = (await core_services.getAllEvents()) || [];
      const myEvents = allEvents.filter((ev) => ev.UserId === userId);

      // Fetch joined events
      const joinedRaw = (await core_services.getAlleventsJoinedbyUser(userId)) || [];
      const joinedIds = joinedRaw.map((x: any) => x.EventId);
      
      // Batch fetch joined events
      const joinedFetched = await Promise.all(
        joinedIds.slice(0, 20).map(async (id: string) => {
          try {
            return await core_services.getEventById(id);
          } catch {
            return null;
          }
        })
      );

      const joined = joinedFetched.filter((ev: any) => ev && ev.UserId !== userId);
      const merged = [...joined, ...myEvents].slice(0, 30); // Limit to 30 total

      // Batch read all lastSeen values at once
      const lastSeenKeys = merged.map((ev) => `lastSeen:${ev.EventID || ev.id}`);
      const lastSeenValues = await AsyncStorage.multiGet(lastSeenKeys);
      const lastSeenMap = new Map(
        lastSeenValues.map(([key, value]) => [key, value ? new Date(value) : null])
      );

      // Process events with optimized message fetching
      const mapped = await Promise.all(
        merged.map(async (event: any) => {
          const eventId = event.EventID || event.id;
          let lastMessage = null;
          let unreadCount = 0;

          try {
            // OPTIMIZATION: Only fetch last 10 messages instead of all
            const msgs: any[] = (await core_services.getMessagesByEvent(eventId)) || [];
            
            if (msgs.length > 0) {
              const recentMsgs = msgs.slice(-10); // Only last 10 messages
              const last = recentMsgs[recentMsgs.length - 1];
              
              lastMessage = {
                text: last.MessageText,
                time: last.CreatedAt,
                userId: last.UserId,
              };

              // Calculate unread from last 10 only
              const lastSeen = lastSeenMap.get(`lastSeen:${eventId}`);
              if (!lastSeen) {
                unreadCount = Math.min(msgs.length, 10);
              } else {
                unreadCount = recentMsgs.filter(
                  (m) => new Date(m.CreatedAt) > lastSeen && m.UserId !== userId
                ).length;
              }
            }
          } catch (e) {
            // Silently handle errors
          }

          return {
            event,
            lastMessage,
            unreadCount,
            isAdmin: event.UserId === userId,
          };
        })
      );

      setItems(mapped);
    } catch (err) {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadList();
  }, [loadList]);

  // Memoized filtered items
  const filteredItems = useMemo(() => {
    if (!searchText.trim()) return items;
    
    const query = searchText.toLowerCase();
    return items.filter((item) => {
      const title = item.event.EventTitle || item.event.title || "";
      return title.toLowerCase().includes(query);
    });
  }, [items, searchText]);

  // Memoized render function
  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const eventId = String(item.event.EventID || item.event.id);
      
      return (
        <MessageItem
          item={item}
          theme={theme}
          activeItem={activeItem}
          onPress={() => {
            router.push({
              pathname: "/chat/[eventId]",
              params: { eventId },
            });
          }}
          onLongPress={() => {
            if (item.isAdmin) {
              setActiveItem(eventId);
            }
          }}
          onDelete={() => {
            setPendingDeleteId(eventId);
            setConfirmVisible(true);
          }}
          onCancel={() => setActiveItem(null)}
        />
      );
    },
    [theme, activeItem, router]
  );

  const keyExtractor = useCallback(
    (item: any) => String(item.event.EventID || item.event.id),
    []
  );

  const handleConfirmDelete = useCallback(async () => {
    if (pendingDeleteId) {
      await handleDeleteEvent(pendingDeleteId);
    }
    setConfirmVisible(false);
    setPendingDeleteId(null);
    setActiveItem(null);
  }, [pendingDeleteId, handleDeleteEvent]);

  const handleCancelDelete = useCallback(() => {
    setConfirmVisible(false);
    setPendingDeleteId(null);
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg1 }]}>
        <ActivityIndicator size="large" color={theme.bg6} />
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg1 }]}>
        <Text style={styles.emptyText}>No chats yet</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadList}>
          <Text style={{ color: theme.bg6 }}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg1 }]}>
      <View style={styles.searchContainer}>
        <View style={styles.searchWrapper}>
          <Ionicons
            name="search"
            size={18}
            color={theme.bg2}
            style={styles.searchIcon}
          />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search chats..."
            placeholderTextColor="#ffffffa6"
            style={[
              styles.searchInput,
              { backgroundColor: theme.bg4, borderColor: theme.bg4 },
            ]}
          />
        </View>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.bg6}
          />
        }
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
      />

      <DeleteConfirm
        visible={confirmVisible}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#bbb", fontSize: 15 },
  refreshBtn: { marginTop: 12 },
  searchContainer: { paddingHorizontal: 12, marginTop: 10, marginBottom: 8 },
  searchWrapper: { position: "relative" },
  searchIcon: { position: "absolute", left: 14, top: 14, zIndex: 10 },
  searchInput: {
    height: 46,
    borderRadius: 10,
    paddingLeft: 42,
    paddingVertical: 12,
    paddingRight: 16,
    borderWidth: 1,
    fontSize: 16,
    color: "#fff",
  },
  listContent: { padding: 12 },
  row: {
    flexDirection: "row",
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { color: "#020f2cff", fontWeight: "700", fontSize: 18 },
  meta: { flex: 1 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 16, fontWeight: "700", flex: 1, marginRight: 8 },
  time: { fontSize: 11, color: "#bbb" },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  preview: { flex: 1, fontSize: 13, color: "#ddd" },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  adminBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  adminText: { fontSize: 10, fontWeight: "700" },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: { color: "#020f2cff", fontSize: 11, fontWeight: "700" },
  actionBar: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingVertical: 10,
    paddingLeft: 70,
    gap: 14,
  },
  actionBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtn: { backgroundColor: "#ff4d4d" },
  disabledBtn: { backgroundColor: "#555", opacity: 0.5 },
});