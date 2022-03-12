import { RequestOptions, RESTDataSource } from 'apollo-datasource-rest';
import { Request, Response } from 'apollo-server-env';
import logger from 'common/logger';
import {
  Omit,
  SensorStation,
  SensorStationMeasurement,
  SensorStationMeasurementValueName,
  SensorStationProvider,
  Coordinates,
} from 'common/types';
import { catcher, coordinatesToGeoJSONPoint } from 'common/utils';
import { name as pkgName, version as pkgVersion } from '../../../package.json';
import { Address, Installation, Measurement, ValueNames } from './types';
import { AirlyKeyRegistry } from './key-registry';

const BASE_URL = 'https://airapi.airly.eu/v2/';
const HEADER_APIKEY = 'apikey';
const HEADER_RATE_LIMIT_REMAINING_MINUTE = 'X-RateLimit-Remaining-minute';
const HEADER_RATE_LIMIT_REMAINING_DAY = 'X-RateLimit-Remaining-day';
const CENTER_OF_POLAND = [52.069344, 19.480202];

// AirqmonServer/x.y.z
const USER_AGENT = `${pkgName
  .split('-')
  .map((part) => {
    return part.replace(/^\w/, (c) => c.toUpperCase());
  })
  .join('')}/${pkgVersion}`;

export class AirlyDataProvider extends RESTDataSource {
  private apiKeyRegistry: AirlyKeyRegistry;

  constructor(apiKeyRegistry: AirlyKeyRegistry) {
    super();

    this.baseURL = BASE_URL;
    this.apiKeyRegistry = apiKeyRegistry;
  }

  private verifyRateLimits(response: Response, _request: Request): boolean {
    if (response.ok) {
      const remainingRateLimitDay = parseInt(
        response.headers.get(HEADER_RATE_LIMIT_REMAINING_DAY.toLowerCase()),
        10,
      );
      const remainingRateLimitMinute = parseInt(
        response.headers.get(HEADER_RATE_LIMIT_REMAINING_MINUTE.toLowerCase()),
        10,
      );

      this.apiKeyRegistry.updateRateLimits(remainingRateLimitDay, remainingRateLimitMinute);

      return true;
    }

    if ([403, 422].includes(response.status)) {
      const apikey = _request.headers.get(HEADER_APIKEY);
      logger.error(`Airly API key is invalid: "${apikey}"`);
    }

    return false;
  }

  protected willSendRequest(request: RequestOptions): void {
    // Set User-Agent (required by some servers)
    request.headers.set('User-Agent', USER_AGENT);
    // Set API key (required by the API)
    try {
      request.headers.set(HEADER_APIKEY, this.apiKeyRegistry.getKey());
    } catch (err) {
      logger.error(err);
    }
  }

  protected async didReceiveResponse<TResult = unknown>(
    response: Response,
    _request: Request,
  ): Promise<TResult> {
    this.verifyRateLimits(response, _request);
    return await super.didReceiveResponse(response, _request);
  }

  protected async getInstallations(): Promise<Installation[]> {
    const [lat, lng] = CENTER_OF_POLAND;

    return this.get<Installation[]>('installations/nearest', {
      lat,
      lng,
      maxDistanceKM: -1, // -1 means no limit
      maxResults: -1, // -1 means no limit
    });
  }

  protected getInstallationDisplayAddress(addr: Address): string {
    const { country, street, displayAddress1, displayAddress2 } = addr;
    if (country && displayAddress1 && displayAddress2) {
      return `${country}, ${displayAddress1}, ${displayAddress2}`;
    }

    if (country && displayAddress1) {
      return `${country}, ${displayAddress1}`;
    }

    if (country && street) {
      return `${country}, ${street}`;
    }

    if (country) {
      return country;
    }

    return '';
  }

  protected convertAirlyInstallationToSensorStation(
    installation: Installation,
  ): Omit<SensorStation, '_id' | 'createdAt' | 'updatedAt' | 'latestMeasurement'> {
    return {
      provider: SensorStationProvider.AIRLY,
      providerId: `${installation.id}`,
      elevation: installation.elevation,
      location: coordinatesToGeoJSONPoint(installation.location),
      displayAddress: this.getInstallationDisplayAddress(installation.address),
    };
  }

  async getAvailableSensorStations(): Promise<
    Omit<SensorStation, '_id' | 'createdAt' | 'updatedAt' | 'latestMeasurement'>[]
  > {
    const [installations, err] = await catcher(this.getInstallations());

    if (err) {
      logger.error(err);
      return [];
    }

    return installations
      .sort((inst1, inst2) => {
        return inst1.id < inst2.id ? -1 : 1;
      })
      .map((installation) => this.convertAirlyInstallationToSensorStation(installation));
  }

  protected mapAirlyValueName(name: ValueNames): SensorStationMeasurementValueName | null {
    return (
      {
        [ValueNames.PM1]: SensorStationMeasurementValueName.PM1,
        [ValueNames.PM10]: SensorStationMeasurementValueName.PM10,
        [ValueNames.PM25]: SensorStationMeasurementValueName.PM25,
        [ValueNames.HUMIDITY]: SensorStationMeasurementValueName.HUMIDITY,
        [ValueNames.PRESSURE]: SensorStationMeasurementValueName.PRESSURE,
        [ValueNames.TEMPERATURE]: SensorStationMeasurementValueName.TEMPERATURE,
      }[name] || null
    );
  }

  protected convertMeasurementToSensorStationMeasurement(
    measurement: Measurement,
  ): SensorStationMeasurement {
    const {
      current: { fromDateTime, tillDateTime, indexes, values },
    } = measurement;

    const stationMeasurement: SensorStationMeasurement = {
      fromDateTime,
      tillDateTime,
      caqi: indexes.find((index) => {
        return index.name == 'CAQI';
      }).value,
      values: values.reduce((acc, value) => {
        const name = this.mapAirlyValueName(value.name);

        if (name != null) {
          return [
            ...acc,
            {
              name,
              value: value.value,
            },
          ];
        }

        return acc;
      }, []),
    };

    return stationMeasurement;
  }

  async getMeasurement(installationId: number): Promise<SensorStationMeasurement | null> {
    const [measurement, err] = await catcher(
      this.get<Measurement>(
        'measurements/installation',
        {
          indexType: 'CAQI',
          installationId,
        },
        {
          redirect: 'follow',
        },
      ),
    );

    if (err) {
      logger.error(err);

      if (err.message) {
        logger.error(err.message);
      }

      return null;
    }

    return this.convertMeasurementToSensorStationMeasurement(measurement);
  }

  async getApproximatedMeasurement(
    location: Coordinates,
  ): Promise<SensorStationMeasurement | null> {
    const { latitude: lat, longitude: lng } = location;
    const [measurement, err] = await catcher(
      this.get<Measurement>(
        'measurements/point',
        {
          indexType: 'CAQI',
          lat,
          lng,
        },
        {
          redirect: 'follow',
        },
      ),
    );

    if (err) {
      logger.error(err);
      return null;
    }

    return {
      ...this.convertMeasurementToSensorStationMeasurement(measurement),
      approximated: true,
    };
  }
}
