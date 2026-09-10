import type { ComponentType } from "react";

export type JobMapProps = {
  visible: boolean;
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  marker: { latitude: number; longitude: number } | null;
  locationLoading: boolean;
  mapLoading: boolean;
  selectedLocation: string;
  onClose: () => void;
  onMapPress: (latitude: number, longitude: number) => void | Promise<void>;
  onCurrentLocation: () => void | Promise<void>;
  onConfirm: () => void;
};

declare const JobMap: ComponentType<JobMapProps>;

export default JobMap;