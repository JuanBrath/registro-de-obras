import type { PlatformAdapterFactory } from "@registro/core";
import { isTauri } from "./detectPlatform.js";

export async function createPlatformAdapterFactory(): Promise<PlatformAdapterFactory> {
  if (isTauri()) {
    const { createTauriAdapterFactory } = await import("./tauri/tauriAdapterFactory.js");
    return createTauriAdapterFactory();
  }

  const { createCapacitorAdapterFactory } = await import("./capacitor/capacitorAdapterFactory.js");
  return createCapacitorAdapterFactory();
}
