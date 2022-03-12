import { DataSource } from 'apollo-datasource';
import { ObjectID } from 'bson';
import logger from 'common/logger';
import {
  Coordinates,
  SensorStation,
  SensorStationMeasurement,
  SensorStationProvider,
} from 'common/types';
import { getDistance, geoJSONPointToCoordinates } from 'common/utils';
import { AirlyDataProvider } from 'data-provider/airly';
import config from 'common/config';
import { IDataStore } from './data-store/types';
import { InMemoryLRUCache } from 'apollo-server-caching';

interface ISensorStationInitOptions {
  store: IDataStore & DataSource;
  airlyAPI: AirlyDataProvider;
}

export class SensorStationModel {
  private store: IDataStore;
  private airlyAPI: AirlyDataProvider;

  constructor({ store, airlyAPI }: ISensorStationInitOptions) {
    [store, airlyAPI].forEach((source) => {
      if (typeof source.initialize == 'function') {
        source.initialize({
          context: {},
          cache: new InMemoryLRUCache(),
        });
      }
    });

    this.store = store;
    this.airlyAPI = airlyAPI;
  }

  async getStation(id: string | ObjectID): Promise<SensorStation | null> {
    const station = await this.store.getStation(id);
    return station;
  }

  async getNearestStation(
    location: Coordinates,
  ): Promise<{ distance: number; station: SensorStation } | null> {
    logger.debug(
      `Looking for a sensor station near [${location.latitude}, ${location.longitude}].`,
    );
    const station = await this.store.getNearestStation(location);

    if (station == null) {
      logger.debug(`No station found in vicinity.`);
      return null;
    }

    const distance = getDistance(station.location, location);
    logger.debug(`Closest station: ${station._id}, distance: ${distance.toFixed(4)} km.`);

    return {
      distance,
      station,
    };
  }

  async getLatestMeasurement(
    stationId: string | ObjectID,
  ): Promise<SensorStationMeasurement | null> {
    logger.debug(`Looking for latest measurements for station ${stationId}.`);

    const station = await this.getStation(stationId);
    const { provider, providerId, location } = station;

    const measurement = await this.store.getStationLatestMeasurement(stationId);
    if (measurement != null) {
      const now = new Date().getTime();
      const validTill = new Date(measurement.tillDateTime).getTime();

      logger.debug(`Found cached data from ${measurement.fromDateTime}.`);

      if (validTill + config.get('cache.ttl.measurements') * 1000 > now) {
        logger.debug(`Cached data is valid, returning.`);
        return measurement;
      }
    }

    logger.debug(`Fetching new measurements for station ${stationId}.`);
    return {
      [SensorStationProvider.AIRLY]: async (
        _id: string | ObjectID,
        providerId: string,
        location: Coordinates,
      ): Promise<SensorStationMeasurement> => {
        let measurement = await this.airlyAPI.getMeasurement(parseInt(providerId, 10));
        // if CAQI is null and there are no values, it proably means that the station is offline
        // try getting the approximated measurements for the location of sensor station
        if (measurement == null || measurement.caqi == null || measurement.values.length == 0) {
          logger.debug(
            `Fetching approximated measurements for location ${location.latitude}, ${location.longitude}.`,
          );

          measurement = await this.airlyAPI.getApproximatedMeasurement(location);
        }

        await this.store.updateSensorStationLatestMeasurement(_id, measurement);
        return measurement;
      },
    }[provider](stationId, providerId, geoJSONPointToCoordinates(location));
  }

  async synchroniseStations(): Promise<void> {
    logger.info('Synchronising sensor stations from Airly.');
    const stations = await this.airlyAPI.getAvailableSensorStations();
    logger.info(`${stations.length} stations found.`);
    const count = await this.store.saveOrUptadeStations(stations);
    logger.info(`${count} entities updated.`);
  }

  async deleteOld(daysBack = 2): Promise<number> {
    logger.info(
      "Deleting sensor stations that were probably removed from the provider's data source.",
    );
    const count = await this.store.cleanup(daysBack);
    logger.info(`Deleted ${count} entities.`);
    return count;
  }
}
