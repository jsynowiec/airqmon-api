require('module-alias/register');

import { ContextFunction } from 'apollo-server-core';
import { ApolloServer } from 'apollo-server-express';
import { ExpressContext } from 'apollo-server-express/dist/ApolloServer';
import logger from 'common/logger';
import { GQLRequestContext } from 'common/types';
import { AirlyDataProvider, airlyApiKeyRegistry } from 'data-provider/airly';
import { MongoDBDataStore } from 'data-store/mongodb';
import * as express from 'express';
import { GeoJSONPointToCoordinatesDirective } from 'gql/directives';
import { resolvers } from 'gql/resolvers';
import { typeDefs } from 'gql/schema';
import config from 'common/config';
import middlewareList from 'server-middleware';

const app = express();
app.enable('trust proxy');

const store = new MongoDBDataStore(config.get('mongodb'));

(async () => {
  await store.init();
})();

const context: ContextFunction<ExpressContext, GQLRequestContext> = () => {
  return {
    store,
  };
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context,
  dataSources: () => {
    return {
      airlyAPI: new AirlyDataProvider(airlyApiKeyRegistry),
    };
  },
  schemaDirectives: {
    toCoordinates: GeoJSONPointToCoordinatesDirective,
  },
});

server.applyMiddleware({ app });

middlewareList.forEach((middleware) => {
  app.use(middleware);
});

const host = config.get('host');
const port = config.get('port');

app.listen({ host, port }, () => {
  logger.info(`Server ready at http://${host}:${port}`);
  logger.info(`GraphQL available at http://${host}:${port}${server.graphqlPath}`);
});
