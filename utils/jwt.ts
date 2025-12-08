// utils/jwt.ts
import { decode as atob } from "base-64";

export function decodeJwt(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + (payload.length % 4 ? "=".repeat(4 - (payload.length % 4)) : "");
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch (e) {
    console.warn("decodeJwt error:", e);
    return null;
  }
}
