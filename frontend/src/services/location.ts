import * as Location from "expo-location";
import { Linking, Platform } from "react-native";
import { type DeviceLocation, locationSchema } from "../domain/contracts";

export type LocationIssue =
  | "permission_denied"
  | "permission_blocked"
  | "disabled"
  | "accuracy_unavailable"
  | "timeout";

export type LocationReading =
  | { readonly status: "available"; readonly location: DeviceLocation }
  | { readonly status: LocationIssue };

const POSITION_TIMEOUT_MS: number = 15000;

function positionReading(result: Location.LocationObject): LocationReading {
  if (result.coords.accuracy === null) {
    return { status: "accuracy_unavailable" };
  }
  return {
    status: "available",
    location: locationSchema.parse({
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
      accuracyMeters: result.coords.accuracy,
    }),
  };
}

/** Batas tunggu UI; API sekali baca Expo tidak menyediakan pembatalan native. */
async function readCurrentPosition(): Promise<LocationReading> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout: Promise<LocationReading> = new Promise((resolve): void => {
    timer = setTimeout((): void => resolve({ status: "timeout" }), POSITION_TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: false,
      }).then(positionReading),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Dialog aktivasi Android hanya muncul setelah pengguna meminta pemeriksaan lokasi. */
async function enableLocationServices(): Promise<boolean> {
  if (await Location.hasServicesEnabledAsync()) return true;
  if (Platform.OS !== "android") return false;
  try {
    await Location.enableNetworkProviderAsync();
  } catch (cause: unknown) {
    if (
      typeof cause !== "object" || cause === null || !("code" in cause) ||
      cause.code !== "ERR_LOCATION_SETTINGS_UNSATISFIED"
    ) throw cause;
    return false;
  }
  return Location.hasServicesEnabledAsync();
}

export async function openLocationServicesSettings(): Promise<void> {
  if (Platform.OS === "android") {
    await Linking.sendIntent("android.settings.LOCATION_SOURCE_SETTINGS");
    return;
  }
  await Linking.openSettings();
}

/** Hanya izin foreground; lokasi tidak dibaca sampai pengunjung menekan tombol. */
export async function readVisitorLocation(
  onProgress: (message: string) => void,
): Promise<LocationReading> {
  onProgress("Memeriksa izin lokasi...");
  const current: Location.LocationPermissionResponse = await Location
    .getForegroundPermissionsAsync();
  if (!current.granted && !current.canAskAgain) return { status: "permission_blocked" };
  const permission: Location.LocationPermissionResponse = current.granted
    ? current
    : await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    return { status: permission.canAskAgain ? "permission_denied" : "permission_blocked" };
  }
  onProgress("Memeriksa GPS perangkat...");
  const enabled: boolean = await enableLocationServices();
  if (!enabled) return { status: "disabled" };
  onProgress("Mencari posisi GPS...");
  return readCurrentPosition();
}
