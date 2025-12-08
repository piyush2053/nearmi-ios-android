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
          backgroundColor: theme.bg1 , // bg1
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

function FloatingAddButton({ onPress }:any) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

      {/* Gradient Button */}
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <LinearGradient
          colors={["#0c2050", "#29C9FF"]}
          start={{ x: 0.1, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={styles.floatingButton}
        >
          <Ionicons name="add" size={26} color="#ffffff83" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingButtonContainer: {
    position: "absolute",
    bottom: 5,
    left: "50%",
    transform: [{ translateX: -29 }], // centers the button perfectly
    alignItems: "center",
    justifyContent: "center",
  },

  glowCircle: {
    position: "absolute",
    width: 70,
    height: 70,
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
