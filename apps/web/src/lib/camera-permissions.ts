import { Camera } from "@capacitor/camera";

export async function requestCameraPermission(): Promise<boolean> {
  const status = await Camera.checkPermissions();

  if (status.camera === "granted") {
    return true;
  }

  if (status.camera === "denied") {
    return false;
  }

  if (status.camera === "prompt") {
    const result = await Camera.requestPermissions();
    return result.camera === "granted";
  }

  return false;
}
