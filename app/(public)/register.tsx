// app/(public)/register.tsx
import { Colors } from "@/constants/theme";
import { core_services } from "@/services/api";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from "react-native";

export default function RegisterScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "dark";
  const theme = Colors[colorScheme];

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [locationStr, setLocationStr] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Location Required",
        "To proceed with registration, please turn on location and come back."
      );
      return;
    }

    const position = await Location.getCurrentPositionAsync({});
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    setLocationStr(`${lat}, ${lng}`);
  };

  useEffect(() => {
    getLocation();
  }, []);

  const triggerSuccessNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Registration Successful",
        body: "You will receive your details shortly via email.",
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
  };


  const handleRegister = async () => {
    if (!username || !email || !password || !confirmPassword)
      return alert("Please fill all fields");

    if (!locationStr)
      return alert("Location not detected. Please enable location and try again.");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return alert("Enter valid email");

    if (password !== confirmPassword) return alert("Passwords do not match");

    setLoading(true);
    try {
      await core_services.registerUser({
        username,
        email,
        password,
        location: locationStr,
      });

      await triggerSuccessNotification();
      router.replace("/(public)/login");
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: theme.bg1 }]}>
      <Text style={[styles.logo, { color: theme.bg6 }]}>NearWee</Text>

      <View style={styles.form}>
        <TextInput
          placeholder="Username"
          placeholderTextColor="#aaa"
          value={username}
          onChangeText={setUsername}
          style={[styles.input, { backgroundColor: theme.bg3, color: theme.bg2 }]}
        />

        <TextInput
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          style={[styles.input, { backgroundColor: theme.bg3, color: theme.bg2 }]}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#aaa"
          value={password}
          onChangeText={setPassword}
          style={[styles.input, { backgroundColor: theme.bg3, color: theme.bg2 }]}
          secureTextEntry
        />

        <TextInput
          placeholder="Confirm Password"
          placeholderTextColor="#aaa"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={[styles.input, { backgroundColor: theme.bg3, color: theme.bg2 }]}
          secureTextEntry
        />


        <TouchableOpacity
          onPress={handleRegister}
          style={[styles.btn, { backgroundColor: theme.bg2 }]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.bg1} />
          ) : (
            <Text style={[styles.btnText, { color: theme.bg1 }]}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(public)/login")} style={{ marginTop: 12 }}>
          <Text style={{ color: "#bbb", textAlign: "center" }}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  logo: { fontSize: 36, fontWeight: "800", marginBottom: 18 },
  form: { width: "100%", maxWidth: 420 },
  input: { height: 48, borderRadius: 30, paddingHorizontal: 16, marginBottom: 12 },
  btn: { height: 48, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  btnText: { fontWeight: "700" },
});
