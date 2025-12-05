
import { Colors } from "@/constants/theme";
import { Feather, FontAwesome5, Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    View,
} from "react-native";

export default function ProfileScreen() {
  const theme = useColorScheme() ?? "dark";
  const c = Colors[theme];

  const user = {
    name: "Piyush",
    avatar:
      "https://media.licdn.com/dms/image/v2/D4D03AQFQqR79XKhXtg/profile-displayphoto-shrink_200_200/B4DZbI3ybFHAAc-/0/1747126790844?e=2147483647&v=beta&t=yWz9P1wpfn9XolGJzAK5QMpk6jrmHFd9QOy1jv-Jsnc",
    location: "Indore",
    joinDate: "Jan 2024",
    events_hosted: 24,
    followers: 22,
    events: 8,
    pastTrips: 12,
    connections: 156,
  };

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 400);
  }, []);

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: c.bg1 }]}>
        <ActivityIndicator size="large" color={c.bg6} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg1 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerText, { color: c.bg2 }]}>Profile</Text>

        <TouchableOpacity>
          <Feather name="more-vertical" size={24} color="#aaa" />
        </TouchableOpacity>
      </View>

      {/* Profile Card */}
      <View style={styles.section}>
        <View style={[styles.card, { backgroundColor: c.bg4 }]}>
          {/* Avatar */}
          <View style={{ position: "relative" }}>
            <Image
              source={{ uri: user.avatar }}
              style={styles.avatar}
            />

            <TouchableOpacity style={[styles.cameraButton, { backgroundColor: c.bg6 }]}>
              <Feather name="camera" size={16} color="black" />
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Text style={[styles.name, { color: c.bg2 }]}>{user.name}</Text>

          {/* Location + Join Date */}
          <View style={styles.rowGap}>
            <View style={styles.rowCenter}>
              <Ionicons name="location-sharp" size={14} color="#aaa" />
              <Text style={styles.subInfo}>{user.location}</Text>
            </View>

            <View style={styles.rowCenter}>
              <Ionicons name="calendar" size={14} color="#aaa" />
              <Text style={styles.subInfo}>Joined {user.joinDate}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <Stat number={user.events_hosted} label="Hosted" />
            <Divider />
            <Stat number={user.followers} label="Followers" />
            <Divider />
            <Stat number={user.events} label="Joined" />
          </View>

          {/* Edit Profile */}
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: c.bg6 }]}
          >
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Activity Cards */}
      <View style={styles.cardRow}>
        <View style={[styles.miniCard, { backgroundColor: c.bg4 }]}>
          <Badge count={user.pastTrips} />
          <CardIcon color={c.bg6}>
            <FontAwesome5 name="trophy" size={28} color="white" />
          </CardIcon>
          <Text style={styles.cardLabel}>Past Events</Text>
        </View>

        <View style={[styles.miniCard, { backgroundColor: c.bg4 }]}>
          <Badge count={user.connections} />
          <CardIcon color="#00BCD4">
            <Feather name="users" size={28} color="white" />
          </CardIcon>
          <Text style={styles.cardLabel}>Connections</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.quickHeader, { color: c.bg2 }]}>
          Quick Actions
        </Text>

        <ActionButton label="Account Settings" icon="settings" theme={c} />
        <ActionButton label="Help & Support" icon="help-circle" theme={c} />
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const Stat = ({ number, label }:any) => (
  <View style={{ alignItems: "center" }}>
    <Text style={styles.statNumber}>{number}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const Divider = () => <View style={styles.divider} />;

const Badge = ({ count }:any) => (
  <View style={styles.badge}>
    <Text style={styles.badgeText}>{count}</Text>
  </View>
);

const CardIcon = ({ children, color }:any) => (
  <View style={[styles.cardIcon, { backgroundColor: color }]}>
    {children}
  </View>
);

const ActionButton = ({ label, icon, theme }:any) => (
  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.bg4 }]}>
    <View style={styles.actionRow}>
      <View style={[styles.actionIcon, { backgroundColor: theme.bg6 + "33" }]}>
        <Feather name={icon} size={20} color={theme.bg6} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </View>

    <Text style={styles.arrow}>›</Text>
  </TouchableOpacity>
);

/* ----------------------------------------- */
/* STYLES */
/* ----------------------------------------- */

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerText: {
    fontSize: 22,
    fontWeight: "600",
  },

  section: {
    padding: 16,
  },

  card: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#29C9FF",
  },

  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    padding: 6,
    borderRadius: 20,
  },

  name: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 10,
  },

  rowGap: {
    flexDirection: "row",
    gap: 14,
    marginTop: 6,
  },

  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  subInfo: {
    color: "#aaa",
    fontSize: 14,
  },

  statsRow: {
    flexDirection: "row",
    marginTop: 20,
    justifyContent: "center",
    gap: 30,
  },

  statNumber: {
    color: "#29C9FF",
    fontSize: 22,
    fontWeight: "700",
  },

  statLabel: {
    color: "#aaa",
    fontSize: 12,
  },

  divider: {
    width: 1,
    height: 40,
    backgroundColor: "#333",
  },

  editBtn: {
    marginTop: 20,
    width: "100%",
    padding: 14,
    borderRadius: 25,
    alignItems: "center",
  },

  editBtnText: {
    color: "black",
    fontSize: 16,
    fontWeight: "600",
  },

  cardRow: {
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 12,
  },

  miniCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },

  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#29C9FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  badgeText: {
    color: "black",
    fontSize: 12,
    fontWeight: "700",
  },

  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  cardLabel: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },

  quickHeader: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },

  actionBtn: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  actionLabel: {
    fontSize: 16,
    color: "white",
  },

  arrow: {
    fontSize: 20,
    color: "#777",
  },
});
