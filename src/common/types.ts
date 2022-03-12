import { ObjectID } from 'mongodb';
import { AirlyDataProvider } from 'data-provider/airly';
import { IDataStore } from 'data-store/types';

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type GeoJSONPoint = {
  type: 'Point';
  coordinates: [number, number];
};

export function isGeoJSONPoint(location: Coordinates | GeoJSONPoint): location is GeoJSONPoint {
  return (<GeoJSONPoint>location).type == 'Point';
}

export interface IProviderAPIKey {
  key: string;
}

export enum SensorStationProvider {
  AIRLY = 'airly',
}

export type SensorStation = {
  _id: string | ObjectID;
  createdAt: Date;
  updatedAt: Date;
  provider: SensorStationProvider;
  providerId: string;
  elevation: number | null;
  location: GeoJSONPoint;
  displayAddress: string;
  latestMeasurement?: SensorStationMeasurement;
};

export enum SensorStationMeasurementValueName {
  PM1 = 'PM1',
  PM25 = 'PM25',
  PM10 = 'PM10',
  PRESSURE = 'PRESSURE',
  HUMIDITY = 'HUMIDITY',
  TEMPERATURE = 'TEMPERATURE',
}

export type SensorStationMeasurementValue = {
  name: SensorStationMeasurementValueName;
  value: number;
};

export type SensorStationMeasurement = {
  fromDateTime: string;
  tillDateTime: string;
  values: SensorStationMeasurementValue[];
  caqi: number;
  approximated?: boolean;
};

export type GQLContextDataSources = {
  airlyAPI: AirlyDataProvider;
};

export type GQLRequestContext = {
  store: IDataStore;
};

export enum JobNames {
  SYNC_STATIONS = 'SYNC_STATIONS',
  CLEANUP_OLD_STATIONS = 'CLEANUP_OLD_STATIONS',
}
