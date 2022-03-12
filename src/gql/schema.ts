import { gql } from 'apollo-server-express';

const locationFields = `
  latitude: Float!
  longitude: Float!
`;

export const typeDefs = gql`
  directive @toCoordinates on FIELD_DEFINITION

  type Location {
    ${locationFields}
  }

  input LocationInput {
    ${locationFields}
  }

  enum ReadingName {
    PM1
    PM25
    PM10
    PRESSURE
    HUMIDITY
    TEMPERATURE
  }

  type ReadingValue {
    name: ReadingName!
    value: Float
  }

  type LatestMeasurements {
    caqi: Float!
    values: [ReadingValue!]!
  }

  type SensorStationProvider {
    name: String!
    url: String
    stationDetails: String
  }

  type SensorStation {
    id: ID!
    provider: SensorStationProvider!
    location: Location! @toCoordinates
    elevation: Float
    displayAddress: String!
    measurements: LatestMeasurements
  }

  type NearestSensorStation {
    distance: Float!
    station: SensorStation!
  }

  type Query {
    nearestSensorStation(location: LocationInput!): NearestSensorStation
    sensorStation(id: ID!): SensorStation
  }
`;
