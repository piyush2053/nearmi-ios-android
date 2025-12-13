import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme.web";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export default function TabsLayout() {
  const rawScheme = useColorScheme();
  const colorScheme = rawScheme ?? "dark";
  const theme = Colors[colorScheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: theme.bg1,
          borderTopColor: "rgba(0,0,0,0.1)",
        },
        tabBarActiveTintColor: "#29C9FF",
        tabBarInactiveTintColor: "rgba(255,255,255,0.4)",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="maps"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => (
            <Ionicons name="navigate" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="create_events"
        options={{
          title: "",
          tabBarButton: ({ onPress }) => <FloatingAddButton onPress={onPress} />,
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubbles" size={22} color={color} />
          ),
        }}
      />

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
  return (
    <View style={styles.floatingButtonContainer}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <LinearGradient
          colors={["#0c2050", "#29C9FF"]}
          start={{ x: 0.1, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={styles.floatingButton}
        >
          <Ionicons name="add" size={26} color="#ffffffe1" />
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
    transform: [{ translateX: -29 }],
    alignItems: "center",
    justifyContent: "center",
  },
  floatingButton: {
    width: 62,
    height: 62,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
});