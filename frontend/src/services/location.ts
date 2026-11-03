import * as Location from "expo-location";
import { type DeviceLocation, locationSchema } from "../domain/contracts";

export type LocationReading =
  | { readonly status: "available"; readonly location: DeviceLocation }
  | {
    readonly status: "permission_denied" | "disabled" | "accuracy_unavailable";
  };

/** Hanya izin foreground; lokasi tidak dibaca sampai pengunjung menekan tombol. */
export async function readVisitorLocation(): Promise<LocationReading> {
  const permission: Location.LocationPermissionResponse = await Location
    .requestForegroundPermissionsAsync();
  if (!permission.granted) return { status: "permission_denied" };
  const enabled: boolean = await Location.hasServicesEnabledAsync();
  if (!enabled) return { status: "disabled" };
  const result: Location.LocationObject = await Location
    .getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
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
