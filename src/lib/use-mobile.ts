"use client";
import { useSyncExternalStore } from "react";
const query = "(max-width: 767px)";
function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function snapshot() {
  return window.matchMedia(query).matches;
}
export function useMobile() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
