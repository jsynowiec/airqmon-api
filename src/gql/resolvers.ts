import { IResolvers } from 'apollo-server-express';
import {
  Coordinates,
  GQLContextDataSources,
  GQLRequestContext,
  SensorStation,
  SensorStationProvider,
} from 'common/types';
import { SensorStationModel } from '../models';

export const resolvers: IResolvers<
  unknown,
  GQLRequestContext & { dataSources: GQLContextDataSources }
> = {
  Query: {
    nearestSensorStation: (
      _,
      { location }: { location: Coordinates },
      { store, dataSources: { airlyAPI } },
    ) => new SensorStationModel({ store, airlyAPI }).getNearestStation(location),
    sensorStation: (_, { id }: { id: string }, { store, dataSources: { airlyAPI } }) =>
      new SensorStationModel({ store, airlyAPI }).getStation(id),
  },
  SensorStation: {
    id: (station: SensorStation) => station._id,
    provider: (station: SensorStation): { name: string; url: string; stationDetails: string } => {
      const {
        provider,
        providerId,
        location: {
          coordinates: [lon, lat],
        },
      } = station;

      return {
        [SensorStationProvider.AIRLY]: {
          name: 'Airly',
          url: 'https://airly.eu',
          stationDetails: `https://airly.eu/map/en/#${lat},${lon},i${providerId}`,
        },
      }[provider];
    },
    measurements: (station: SensorStation, _, { store, dataSources: { airlyAPI } }) =>
      new SensorStationModel({ store, airlyAPI }).getLatestMeasurement(station._id),
  },
};
