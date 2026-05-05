import type { TrackerApi } from "../../electron/preload";

declare global {
  interface Window {
    tracker: TrackerApi;
  }
}

export const api = window.tracker;
export type { TrackerApi };
