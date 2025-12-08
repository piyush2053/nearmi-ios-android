// app/(tabs)/messages/index.tsx
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { core_services } from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type EventItem = any;

export default function MessagesWrapper() {
    const router = useRouter();
    const { user }: any = useAuth();
    const colorScheme = "dark"; // keep simple; you can use hook
    const theme = Colors[colorScheme];

    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState(false);
    const [items, setItems] = useState<
        { event: EventItem; lastMessage?: any; unreadCount: number; isAdmin: boolean }[]
    >([]);

    const loadList = useCallback(async () => {
        if (!user?.id && !user?.userId) {
            setItems([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // 1) Fetch all events (we use same logic as web to split my vs joined)
            const allEvents: any[] = (await core_services.getAllEvents()) || [];

            // My events (admin)
            const myEvents = allEvents.filter((ev) => ev.UserId === (user.userId || user.id));

            // Events user joined
            const joinedRaw = (await core_services.getAlleventsJoinedbyUser(user.userId || user.id)) || [];
            const joinedIds = joinedRaw.map((x: any) => x.EventId);
            const joinedPromises = joinedIds.map(async (id: string) => {
                try {
                    return await core_services.getEventById(id);
                } catch {
                    return null;
                }
            });
            const joinedFetched = (await Promise.all(joinedPromises)).filter(Boolean);

            // Merge events — show joined first (not admin)
            const joined = joinedFetched.filter((ev: any) => ev.UserId !== (user.userId || user.id));
            const merged = [...joined, ...myEvents];

            // For each event, fetch last message (lightweight: we just need last)
            const mapped = await Promise.all(
                merged.slice(0, 40).map(async (event: any) => {
                    let lastMessage = null;
                    let unreadCount = 0;
                    try {
                        const msgs: any[] = (await core_services.getMessagesByEvent(event.EventID || event.id)) || [];
                        if (Array.isArray(msgs) && msgs.length) {
                            // last message = last item
                            const last = msgs[msgs.length - 1];
                            lastMessage = {
                                text: last.MessageText,
                                time: last.CreatedAt,
                                userId: last.UserId,
                            };

                            // unread logic: compare to stored lastSeen
                            const lastSeenRaw = await AsyncStorage.getItem(`lastSeen:${event.EventID}`);
                            const lastSeen = lastSeenRaw ? new Date(lastSeenRaw) : null;
                            if (!lastSeen) {
                                // all messages are unread (or decide to set unread 0 if you want)
                                unreadCount = msgs.length;
                            } else {
                                unreadCount = msgs.filter((m) => new Date(m.CreatedAt) > lastSeen && m.UserId !== (user.userId || user.id)).length;
                            }
                        }
                    } catch (e) {
                        // ignore per-event errors
                    }

                    return {
                        event,
                        lastMessage,
                        unreadCount,
                        isAdmin: event.UserId === (user.userId || user.id),
                    };
                })
            );

            setItems(mapped);
        } catch (err) {
            console.warn("Messages list error:", err);
            setItems([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        loadList();
    }, [loadList]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadList();
    };

    const renderItem = ({ item }: { item: any }) => {
        const { event, lastMessage, unreadCount, isAdmin } = item;
        const title = event.EventTitle || event.title || "Untitled";
        const subtitle = lastMessage?.text ?? event.EventDesc ?? "";
        const time = lastMessage?.time ? format(new Date(lastMessage.time), "hh:mm aa") : "";

        return (
            <TouchableOpacity
                style={[styles.row, { backgroundColor: theme.bg4 }]}
                onPress={() => {
                    // navigate to messages chat
                    router.push({
                        pathname: "/chat/[eventId]",
                        params: { eventId: String(event.EventID || event.id) },
                    });

                }}
            >
                <View style={[styles.avatar, { backgroundColor: theme.bg6 }]}>
                    <Text style={{ color: theme.bg1, fontWeight: "700" }}>{(title || "E").charAt(0)}</Text>
                </View>

                <View style={styles.meta}>
                    <View style={styles.rowTop}>
                        <Text style={[styles.title, { color: theme.bg2 }]} numberOfLines={1}>
                            {title}
                        </Text>
                        <Text style={[styles.time, { color: "#bbb" }]}>{time}</Text>
                    </View>

                    <View style={styles.rowBottom}>
                        <Text style={[styles.preview, { color: "#ddd" }]} numberOfLines={1}>
                            {subtitle}
                        </Text>

                        <View style={styles.badgeRow}>
                            {isAdmin && (
                                <View style={[styles.adminBadge, { borderColor: theme.bg6 }]}>
                                    <Text style={[styles.adminText, { color: theme.bg6 }]}>ADMIN</Text>
                                </View>
                            )}

                            {unreadCount > 0 && (
                                <View style={[styles.unreadBadge, { backgroundColor: theme.bg6 }]}>
                                    <Text style={{ color: theme.bg1, fontSize: 12, fontWeight: "700" }}>{unreadCount}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

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
                <Text style={{ color: "#bbb" }}>No chats yet</Text>
                <TouchableOpacity style={{ marginTop: 12 }} onPress={() => loadList()}>
                    <Text style={{ color: theme.bg6 }}>Refresh</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.bg1 }]}>
            <FlatList
                data={items}
                keyExtractor={(it) => String(it.event.EventID || it.event.id)}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.bg6} />}
                contentContainerStyle={{ padding: 12 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },

    row: {
        flexDirection: "row",
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        alignItems: "center",
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    meta: { flex: 1 },
    rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    title: { fontSize: 16, fontWeight: "700" },
    time: { fontSize: 11 },

    rowBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
    preview: { flex: 1, fontSize: 13 },

    badgeRow: { flexDirection: "row", alignItems: "center", marginLeft: 8 },
    adminBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
    adminText: { fontSize: 10, fontWeight: "700" },

    unreadBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
