import { Capacitor } from "@capacitor/core";

export const isNative = (): boolean => Capacitor.isNativePlatform();
export const getPlatform = (): string | undefined => Capacitor.getPlatform();
