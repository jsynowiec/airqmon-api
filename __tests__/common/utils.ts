import {
  degreesToRadians,
  getDistance,
  coordinatesToGeoJSONPoint,
  geoJSONPointToCoordinates,
} from '../../src/common/utils';
import { GeoJSONPoint, Coordinates } from '../../src/common/types';

describe('degreesToRadians conversion helper', () => {
  it('Should convert degrees to radians', () => {
    expect(degreesToRadians(45).toFixed(8)).toBe('0.78539816');
    expect(degreesToRadians(90).toFixed(8)).toBe('1.57079633');
    expect(degreesToRadians(120).toFixed(8)).toBe('2.09439510');
  });
});

describe('Distance between Coordinates helper', () => {
  it('Should return distance in km between two given Coordinatess', () => {
    const loc1: Coordinates = {
      latitude: 51.509865,
      longitude: -0.118092,
    };

    const loc2: Coordinates = {
      latitude: 52.509865,
      longitude: 1.218092,
    };

    expect(getDistance(loc1, loc2).toFixed(8)).toBe('143.96684732');
    expect(getDistance(loc1, loc2)).toBe(getDistance(loc2, loc1));
  });

  it('Should handle Coordinates and GeoJSONPoint types', () => {
    const loc1: Coordinates = {
      latitude: 51.509865,
      longitude: -0.118092,
    };

    const loc2: GeoJSONPoint = {
      type: 'Point',
      coordinates: [1.218092, 52.509865],
    };

    expect(getDistance(loc1, loc2).toFixed(8)).toBe('143.96684732');
    expect(getDistance(loc2, loc1).toFixed(8)).toBe('143.96684732');
  });
});

describe('geoJSONPointToCoordinates conversion helper', () => {
  it('Should convert GeoJSON point to Coordinates', () => {
    const point: GeoJSONPoint = {
      type: 'Point',
      coordinates: [1.218092, 52.509865],
    };

    expect(geoJSONPointToCoordinates(point)).toEqual({
      latitude: 52.509865,
      longitude: 1.218092,
    });
  });
});

describe('coordinatesToGeoJSONPoint conversion helper', () => {
  it('Should convert GeoJSON point to Coordinates', () => {
    const point: Coordinates = {
      latitude: 52.509865,
      longitude: 1.218092,
    };

    expect(coordinatesToGeoJSONPoint(point)).toEqual({
      type: 'Point',
      coordinates: [1.218092, 52.509865],
    });
  });
});
