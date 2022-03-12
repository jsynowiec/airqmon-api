import { Coordinates, GeoJSONPoint, isGeoJSONPoint } from 'common/types';

const EARTH_RADIUS_KM = 6371; // Earth's radius in kilometers

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function coordinatesToGeoJSONPoint(location: Coordinates): GeoJSONPoint {
  const { latitude, longitude } = location;
  return {
    type: 'Point',
    coordinates: [longitude, latitude],
  };
}

export function geoJSONPointToCoordinates(location: GeoJSONPoint): Coordinates {
  const [longitude, latitude] = location.coordinates;
  return { latitude, longitude };
}

export function getDistance(
  loc1: Coordinates | GeoJSONPoint,
  loc2: Coordinates | GeoJSONPoint,
): number {
  const [location1, location2] = [loc1, loc2].map((loc) => {
    return isGeoJSONPoint(loc) ? geoJSONPointToCoordinates(loc) : <Coordinates>loc;
  });

  const latDelta = degreesToRadians(location2.latitude - location1.latitude);
  const lonDelta = degreesToRadians(location2.longitude - location1.longitude);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(degreesToRadians(location1.latitude)) *
      Math.cos(degreesToRadians(location2.latitude)) *
      Math.sin(lonDelta / 2) *
      Math.sin(lonDelta / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

export function catcher<T = unknown, E = Error>(
  promise: Promise<T>,
): Promise<[T | undefined, E | null]> {
  return promise
    .then<[T, null]>((data: T) => [data, null])
    .catch<[undefined, E]>((err: E) => {
      return [undefined, err];
    });
}

export function* chunkArray<T>(arr: T[], chunkSize: number): Generator<T[]> {
  while (arr.length) {
    yield arr.splice(0, chunkSize);
  }
}
