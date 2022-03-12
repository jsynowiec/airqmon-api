import { isGeoJSONPoint } from 'common/types';
import { geoJSONPointToCoordinates } from 'common/utils';
import { defaultFieldResolver, GraphQLField } from 'graphql';
import { SchemaDirectiveVisitor } from 'graphql-tools';

export class GeoJSONPointToCoordinatesDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<unknown, unknown>): void {
    const { resolve = defaultFieldResolver } = field;

    field.resolve = async function (...args) {
      const result = await resolve.apply(this, args);

      if (isGeoJSONPoint(result)) {
        return geoJSONPointToCoordinates(result);
      }

      return result;
    };
  }
}
