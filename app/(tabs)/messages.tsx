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
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";


type EventItem = any;

export default function MessagesWrapper() {
    const router = useRouter();
    const { user }: any = useAuth();
    const colorScheme = "dark"; // keep simple; you can use hook
    const theme = Colors[colorScheme];
    const [showTip, setShowTip] = useState(false);
    const [tipOpacity] = useState(new Animated.Value(0));
    const [activeItem, setActiveItem] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState(false);
    const [items, setItems] = useState<
        { event: EventItem; lastMessage?: any; unreadCount: number; isAdmin: boolean }[]
    >([]);
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const [searchText, setSearchText] = useState("");

    // Animated placeholder (same as Home screen)
    const placeholderOptions = [
        "Search chats...",
        "Search groups...",
        "Search messages...",
    ];

    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [animatedPlaceholder, setAnimatedPlaceholder] = useState(placeholderOptions[0]);

    const fadeAnim = useRef(new Animated.Value(1)).current;
    const translateY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const interval = setInterval(() => {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 10,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setPlaceholderIndex((prev) => {
                    const next = (prev + 1) % placeholderOptions.length;
                    setAnimatedPlaceholder(placeholderOptions[next]);
                    return next;
                });

                translateY.setValue(-10);

                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.timing(translateY, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                ]).start();
            });
        }, 4500);

        return () => clearInterval(interval);
    }, []);
    useEffect(() => {
        AsyncStorage.getItem("tipShown").then((v) => {
            if (!v) {
                setShowTip(true);
                Animated.timing(tipOpacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }).start();

                setTimeout(() => {
                    Animated.timing(tipOpacity, {
                        toValue: 0,
                        duration: 800,
                        useNativeDriver: true,
                    }).start(() => setShowTip(false));
                }, 7000);

                AsyncStorage.setItem("tipShown", "true");
            }
        });
    }, []);

    const handleDeleteEvent = async (eventId: any) => {
        try {
            await core_services.deleteEvent(eventId);

            // Remove from UI
            setItems((prev) => prev.filter((it) => (it.event.EventID || it.event.id) !== eventId));

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
    };
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
                style={[
                    styles.row,
                    {
                        backgroundColor: activeItem === String(event.EventID || event.id) ? theme.bg7 : theme.bg1,
                        borderBottomWidth: 0.4,
                        borderBottomColor: "#444", // thin WhatsApp-like divider
                    },
                ]}

                onPress={() => {
                    router.push({
                        pathname: "/chat/[eventId]",
                        params: { eventId: String(event.EventID || event.id) },
                    });
                }}
                onLongPress={() => {
                    if (!isAdmin) return;
                    setActiveItem(String(event.EventID || event.id));
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
                            {isAdmin && activeItem !== String(event.EventID || event.id) && (
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
                {activeItem === String(event.EventID || event.id) && (
                    <View style={styles.actionBar}>

                        {/* DELETE */}
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: "#ff4d4d" }]}
                            onPress={() => {
                                setPendingDeleteId(String(event.EventID || event.id));
                                setConfirmVisible(true);
                            }}


                        >
                            <Ionicons name="trash" size={21} color={'#fff'}></Ionicons>
                        </TouchableOpacity>

                        {/* EDIT (disabled) */}
                        <View style={[styles.actionBtn, { backgroundColor: "#555", opacity: 0.5 }]}>
                            <Ionicons name="create" size={21} color={'#fff'}></Ionicons>
                        </View>

                        {/* INFO (disabled) */}
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: "#555", opacity: 0.5 }]}
                            onPress={() => {
                                // undo long press action
                                setActiveItem(null);
                            }}
                        >
                            <Ionicons name="ban" size={21} color={'#fff'} />
                        </TouchableOpacity>


                    </View>
                )}

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
    const filteredItems = items.filter((item) => {
        const title = item.event.EventTitle || item.event.title || "";
        return title.toLowerCase().includes(searchText.toLowerCase());
    });

    return (
        <View style={[styles.container, { backgroundColor: theme.bg1 }]}>
            {showTip && (
                <Animated.View
                    style={{
                        opacity: tipOpacity,
                        backgroundColor: "rgba(87, 87, 87, 1)",
                        padding: 20,
                        borderRadius: 10,
                        alignSelf: "center",
                        marginTop: 10,
                    }}
                >
                    <Text style={{ color: "#fff", fontSize: 13 }}>
                        Tip: Long press a group to see more actions.
                    </Text>
                </Animated.View>
            )}
            <View style={{ paddingHorizontal: 12, marginTop: 10 }}>
                <View style={{ position: "relative" }}>
                    <Ionicons
                        name="search"
                        size={18}
                        color={theme.bg2}
                        style={{ position: "absolute", left: 14, top: 14, zIndex: 10 }}
                    />

                    <TextInput
                        value={searchText}
                        onChangeText={setSearchText}
                        style={[
                            styles.searchInput,
                            { backgroundColor: theme.bg4, borderColor: theme.bg4, color: "#fff" },
                        ]}
                    />

                    {searchText.length === 0 && (
                        <Animated.Text
                            style={{
                                position: "absolute",
                                left: 42,
                                top: 13,
                                fontSize: 16,
                                color: "#ffffffa6",
                                opacity: fadeAnim,
                                transform: [{ translateY }],
                            }}
                        >
                            {animatedPlaceholder}
                        </Animated.Text>
                    )}
                </View>
            </View>
            <FlatList
                data={filteredItems}
                keyExtractor={(it) => String(it.event.EventID || it.event.id)}
                renderItem={renderItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.bg6} />}
                contentContainerStyle={{ padding: 12 }}
            />

            <DeleteConfirm
                visible={confirmVisible}
                onClose={() => {
                    setConfirmVisible(false);
                    setPendingDeleteId(null);
                }}
                onConfirm={async () => {
                    if (pendingDeleteId) {
                        await handleDeleteEvent(pendingDeleteId);
                    }
                    setConfirmVisible(false);
                    setPendingDeleteId(null);
                    setActiveItem(null);
                }}
            />

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
        borderRadius: 21,
        justifyContent: "center",
        alignItems: "center",
    },

    actionText: {
        color: "#fff",
        fontSize: 20,
    },
    popupOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 999,
    },

    popupBox: {
        width: "82%",
        backgroundColor: "#020f2cff",
        padding: 20,
        borderRadius: 16,
        elevation: 10,
    },

    popupTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#fff",
        marginBottom: 10,
    },

    popupDesc: {
        color: "#ccc",
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 20,
    },

    popupButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
    },

    popupBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
    },

    popupBtnText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    popupBtnTextYes: {
        color: "#020f2cff",
        fontSize: 14,
        fontWeight: "600",
    },
    searchInput: {
        height: 46,
        borderRadius: 10,
        paddingLeft: 42,
        paddingVertical: 12,
        paddingRight: 16,
        borderWidth: 1,
        fontSize: 16,
    },

});
