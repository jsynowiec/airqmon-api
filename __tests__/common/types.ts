import { GeoJSONPoint, isGeoJSONPoint, Coordinates } from '../../src/common/types';

describe('isGeoJSONPoint typeguard', () => {
  it('Should return true for valid GeoJSONPoint object', () => {
    const location: GeoJSONPoint = {
      type: 'Point',
      coordinates: [-0.118092, 51.509865],
    };

    expect(isGeoJSONPoint(location)).toBe(true);
  });

  it('Should return false for invalid GeoJSONPoint object', () => {
    const location: Coordinates = {
      latitude: 51.509865,
      longitude: -0.118092,
    };

    expect(isGeoJSONPoint(location)).toBe(false);
  });
});
