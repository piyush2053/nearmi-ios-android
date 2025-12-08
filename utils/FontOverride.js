import React from "react";
import { Text, TextInput } from "react-native";

// Patch ALL internal text renderers
const patchText = (Component) => {
  const oldRender = Component.render;
  Component.render = function (...args) {
    const origin = oldRender.call(this, ...args);
    return React.cloneElement(origin, {
      style: [{ fontFamily: "Cereal-Regular" }, origin.props.style],
    });
  };
};

export function applyGlobalFont() {
  try {
    patchText(Text);
    patchText(TextInput);

    // For new Architecture (Fabric)
    if (Text.__internal) {
      patchText(Text.__internal);
    }
    if (Text.render) {
      patchText(Text);
    }

    console.log("Global font override applied");
  } catch (e) {
    console.warn("Font override failed:", e);
  }
}
