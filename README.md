# Airqmon API

GraphQL API and worker service for the [Airqmon](https://airqmon.app) app.

# Data providers and data stores

The API currently only supports Airly as a data provider but can be easily extended by adding more data sources. The Airly data provider servers as an example implementation of the Apollo RESTDataSource, while the MongoDB data store as an example of the IDataStore interface.

# Build

Install the dependencies by running `yarn` and then run `yarn run build` to compile TypeScript.

# Deploy

The easiest way to deploy and run the Airqmon server components is to use a PaS provider like [Railway](https://docs.railway.app/deploy/nodejs), [Render](https://render.com/docs/migrate-from-heroku), [Heroku](https://devcenter.heroku.com/articles/getting-started-with-nodejs?singlepage=true#deploy-the-app) or any other PaaS that supports [Node.js buildpack](https://devcenter.heroku.com/articles/buildpacks) for deployment.

If you want a self-hosted solution, check [Dokku](https://dokku.com/docs/deployment/application-deployment/). To simplify the setup, you can use the [DigitalOcean 1-Click App with Dokku](https://marketplace.digitalocean.com/apps/dokku).

## MongoDB

Whatever you choose, you will also need a MongoDB database to cache the sensor stations and measurements.

Render allows running MongoDB as a [private service](https://render.com/docs/deploy-mongodb), Railway to add a MongoDB [service](https://docs.railway.app/databases/mongodb), MongoDB Atlas integrates easily with Heroku applications, and Dokku has an excellent [plugin](https://github.com/dokku/dokku-mongo) for managing a self-hosted MongoDB database.

## Cron Job Monitoring

The Agenda worker can make an HTTP request each time a task completes. You can use a service like [Healthchecks.io](https://healthchecks.io) to monitor whether the stations-sync tasks succeeded.

## Settings

The API server and tasks worker use [Convict](https://github.com/mozilla/node-convict/tree/master/packages/convict) for loading and managing configuration. See the [common/config.ts](src/common/config.ts) for schema and default options.

Create a `production.json` file in the `config` directory and provide at least the API key and MongoDB connection string.

```json
{
  "apiKeys": {
    "airly": {
      "key": "YOUR_AIRLY_API_KEY",
      "rateLimitDay": 1000,
      "rateLimitMinute": 50
    }
  },
  "mongodb": "MONGODB_CONNECTION_URI"
}
```

Alternatively, you can use the environment variables to configure some of the settings.
