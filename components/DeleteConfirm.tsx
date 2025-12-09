// components/DeleteConfirm.tsx
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";

const { width } = Dimensions.get("window");

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DeleteConfirm({ visible, onClose, onConfirm }: Props) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 8, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.9, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, opacity, scale]);

  if (!visible) return null;

  const runShakeThenConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => {
      onConfirm();
      onClose();
    });
  };

  // for Animated.View style typing we cast a bit to any to satisfy TS
  const animatedStyle: StyleProp<ViewStyle> = {
    transform: [{ scale }, { translateX: shake }],
    opacity,
  } as any;

  return (
    <View style={styles.wrapper}>
      {/* Backdrop + blur */}
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <BlurView intensity={50} tint="dark" style={styles.fill}>
          <TouchableOpacity style={styles.fill} activeOpacity={1} onPress={onClose} />
        </BlurView>
      </Animated.View>

      {/* Modal */}
      <Animated.View style={[styles.modal, animatedStyle as any]}>
        <Text style={styles.title}>Are you sure?</Text>

        <Text style={styles.desc}>
          By deleting you may lose all chats, connections, discussions, event data, and much more.
        </Text>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.noBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.noText}>No</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.yesBtn} onPress={runShakeThenConfirm} activeOpacity={0.85}>
            <Text style={styles.yesText}>Yes, Delete</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  fill: { flex: 1 },

  modal: {
    width: width * 0.82,
    padding: 20,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { height: 4, width: 0 },
    elevation: 12,
    alignItems: "center",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },

  desc: {
    color: "#ddd",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
  },

  btnRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  noBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginRight: 8,
    alignItems: "center",
  },
  noText: { color: "#fff", fontWeight: "600" },

  yesBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#ff4d4d",
    marginLeft: 8,
    alignItems: "center",
  },
  yesText: { color: "#fff", fontWeight: "700" },
});
