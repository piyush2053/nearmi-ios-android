import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme.web";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";

export default function TabsLayout() {
  const rawScheme = useColorScheme();
  const colorScheme = rawScheme ?? "dark"; // SAFE fallback
  const theme = Colors[colorScheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: theme.bg1, // bg1
          borderTopColor: "rgba(0,0,0,0.1)"
        },
        tabBarActiveTintColor: "#29C9FF",
        tabBarInactiveTintColor: "rgba(255,255,255,0.4)",
      }}
    >
      {/* HOME */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={22} color={color} />
          ),
        }}
      />

      {/* BOOKINGS */}
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color }) => (
            <Ionicons name="calendar" size={22} color={color} />
          ),
        }}
      />

      {/* CREATE EVENTS — CUSTOM FLOATING BUTTON */}
      <Tabs.Screen
        name="create_events"
        options={{
          title: "",
          tabBarButton: ({ onPress }) => <FloatingAddButton onPress={onPress} />,
        }}
      />

      {/* MESSAGES */}
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubbles" size={22} color={color} />
          ),
        }}
      />

      {/* PROFILE */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
function FloatingAddButton({ onPress }: any) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // NEW: NW animation controls
  const nwOpacity = useRef(new Animated.Value(0)).current;
  const nwScale = useRef(new Animated.Value(0.7)).current;

  // Pulsing Glow
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  const plusOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = setInterval(() => {
      // Fade IN NW + Fade OUT Plus
      Animated.parallel([
        Animated.timing(nwOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(nwScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(plusOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Fade OUT NW + Fade IN Plus after 3 sec
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(nwOpacity, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(nwScale, {
            toValue: 0.7,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(plusOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      }, 3000);

    }, 5000);

    return () => clearInterval(loop);
  }, []);

  return (
    <View style={styles.floatingButtonContainer}>
      {/* Pulsing Glow */}
      <Animated.View
        style={[
          styles.glowCircle,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <LinearGradient
          colors={["#0c2050", "#29C9FF"]}
          start={{ x: 0.1, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={styles.floatingButton}
        >
          {/* Plus Icon */}
          <Animated.View style={{ opacity: plusOpacity }}>
            <Ionicons name="add" size={26} color="#ffffffe1" />
          </Animated.View>

          {/* NW Animated Text */}
          <Animated.Text
            style={{
              position: "absolute",
              color: "#FFF",
              fontFamily: "Cereal-regular",
              fontSize: 16,
              fontWeight:400,
              opacity: nwOpacity,
              transform: [{ scale: nwScale }],
            }}
          >
            Hey !
          </Animated.Text>
        </LinearGradient>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  floatingButtonContainer: {
    position: "absolute",
    bottom: 4,
    left: "50%",
    transform: [{ translateX: -29 }], // centers the button perfectly
    alignItems: "center",
    justifyContent: "center",
  },

  glowCircle: {
    position: "absolute",
    width: 65,
    height: 65,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },

  floatingButton: {
    width: 58,
    height: 58,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#29C9FF",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
