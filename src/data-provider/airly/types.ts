import { Coordinates } from 'common/types';

export type Address = {
  country?: string | null;
  city?: string | null;
  street?: string | null;
  number?: string | null;
  displayAddress1?: string | null;
  displayAddress2?: string | null;
};

export type Sponsor = {
  id: number;
  name: string;
  description?: string | null;
  logo?: string | null;
  link?: string | null;
  displayName?: string | null;
};

// https://developer.airly.eu/docs#concepts.installations
export type Installation = {
  id: number;
  location: Coordinates;
  locationId: number;
  address: Address;
  elevation: number;
  airly: boolean;
  sponsor: Sponsor;
};

export type Measurement = {
  current: MeasurementAveragedValues;
  history: MeasurementAveragedValues[];
  forecast: MeasurementAveragedValues[];
};

export type MeasurementAveragedValues = {
  fromDateTime: string;
  tillDateTime: string;
  values: Value[];
  indexes: Index[];
  standards: Standard[];
};

export enum ValueNames {
  PM1 = 'PM1',
  PM25 = 'PM25',
  PM10 = 'PM10',
  PRESSURE = 'PRESSURE',
  HUMIDITY = 'HUMIDITY',
  TEMPERATURE = 'TEMPERATURE',
}

export type Value = {
  name: ValueNames;
  value: number;
};

export type Index = {
  name: 'AIRLY_CAQI' | 'CAQI' | 'PIJP';
  value: number;
  level: 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  description: string;
  advice: string;
  color: string;
};

export type Standard = {
  name: 'WHO';
  pollutant: 'PM10' | 'PM25';
  limit: number;
  percent: number;
};
