// app/(public)/login.tsx
import { Colors } from "@/constants/theme"; // your theme
import { useAuth } from "@/contexts/AuthContext";
import { core_services } from "@/services/api";
import { decodeJwt } from "@/utils/jwt";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const colorScheme = useColorScheme() ?? "dark";
  const theme = Colors[colorScheme];
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      return alert("Please provide email and password");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return alert("Please enter a valid email");
    }

    setLoading(true);
    try {
      const data = await core_services.loginUser({ email, password });
      const token: string = data?.token || data?.accessToken || "";

      if (!token) throw new Error("No token returned from server");
      // decode
      const payload = decodeJwt(token);
      const user = {
        id: payload?.userId || payload?.id || null,
        name: payload?.username || payload?.name || "",
        email: payload?.email || email,
        role: payload?.role || "user",
      };

      await login({ token, user });
      // navigate to home (tabs)
      router.replace("/");
    } catch (err: any) {
      console.log("FULL ERROR:", err); // <- shows actual error

      let msg = "Login failed";

      // 1) If API returned plain JSON { error: "Invalid credentials" }
      if (err?.error) {
        msg = err.error;
      }

      // 2) axios-like structured error
      else if (err?.response?.data?.error) {
        msg = err.response.data.error;
      }
      else if (err?.response?.data?.message) {
        msg = err.response.data.message;
      }

      // 3) If message contains JSON
      else if (typeof err?.message === "string" && err.message.includes("{")) {
        try {
          const parsed = JSON.parse(err.message.replace("Error: ", ""));
          if (parsed.error) msg = parsed.error;
          else if (parsed.message) msg = parsed.message;
        } catch (_) { }
      }

      alert(msg);
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: theme.bg1 }]}>
      <Text style={[styles.logo, { color: theme.bg6 }]}>NearWee</Text>

      <View style={styles.form}>
        <TextInput
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          style={[styles.input, { backgroundColor: theme.bg3, color: theme.bg2 }]}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={{ position: "relative" }}>
          <TextInput
            placeholder="Password"
            placeholderTextColor="#aaa"
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { backgroundColor: theme.bg3, color: theme.bg2, paddingRight: 45 }]}
            secureTextEntry={!showPassword}
          />

          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: 14,
              top: 12,
            }}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={22}
              color="#aaa"
            />
          </TouchableOpacity>
        </View>


        <TouchableOpacity onPress={handleLogin} style={[styles.btn, { backgroundColor: theme.bg2 }]} disabled={loading}>
          {loading ? <ActivityIndicator color={theme.bg1} /> : <Text style={[styles.btnText, { color: theme.bg1 }]}>Sign In</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(public)/register")} style={{ marginTop: 12 }}>
          <Text style={{ color: "#bbb", textAlign: 'center' }}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  logo: { fontSize: 36, fontWeight: "800", marginBottom: 24 },
  form: { width: "100%", maxWidth: 420 },
  input: { height: 48, borderRadius: 30, paddingHorizontal: 16, marginBottom: 12 },
  btn: { height: 48, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  btnText: { fontWeight: "700" },
});
