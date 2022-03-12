import { ObjectID } from 'bson';
import { Coordinates, Omit, SensorStation, SensorStationMeasurement } from 'common/types';

export interface IDataStore {
  getStation(id: string | ObjectID): Promise<SensorStation | null>;
  getNearestStation(location: Coordinates): Promise<SensorStation | null>;
  getStationLatestMeasurement(id: string | ObjectID): Promise<SensorStationMeasurement | null>;
  saveOrUptadeStations(
    stations: Omit<SensorStation, '_id' | 'createdAt' | 'updatedAt' | 'latestMeasurement'>[],
  ): Promise<number>;
  updateSensorStationLatestMeasurement(
    id: string | ObjectID,
    latestMeasurement: SensorStationMeasurement,
  ): Promise<number>;
  cleanup(daysBack: number): Promise<number>;
}
