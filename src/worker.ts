require('module-alias/register');

import { Agenda } from 'agenda/es';
import * as https from 'https';

import config from 'common/config';
import logger from 'common/logger';
import { JobNames } from 'common/types';
import { SensorStationModel } from './models';
import { MongoDBDataStore } from 'data-store/mongodb';
import { AirlyDataProvider, airlyApiKeyRegistry } from 'data-provider/airly';
import { Job } from 'agenda';

const sensorStationModel = new SensorStationModel({
  store: new MongoDBDataStore(config.get('mongodb')),
  airlyAPI: new AirlyDataProvider(airlyApiKeyRegistry),
});

export const agenda = new Agenda({
  db: {
    address: config.get('mongodb'),
    options: { useNewUrlParser: true, useUnifiedTopology: true },
  },
});

async function graceful() {
  await agenda.stop();
  process.exit(0);
}

process.on('SIGTERM', graceful);
process.on('SIGINT', graceful);

agenda.on('start', (job: Job) => {
  logger.debug(`Job ${job.attrs.name} starting.`);
});

agenda.on('complete', (job: Job) => {
  const healtcheck = config.get(`jobSchedule.${job.attrs.name}.healtcheck`);
  if (healtcheck != null) {
    https.get(healtcheck);
    logger.debug(healtcheck);
    logger.debug(`Healthcheck ping sent.`);
  }

  logger.debug(`Job ${job.attrs.name} finished.`);
});

agenda.define(JobNames.SYNC_STATIONS, async (_, done) => {
  await sensorStationModel.synchroniseStations();

  done();
});

agenda.define(JobNames.CLEANUP_OLD_STATIONS, async (_, done) => {
  await sensorStationModel.deleteOld();

  done();
});

if (require.main === module) {
  (async function() {
    await agenda.start();
    logger.info(`Agenda worker ready.`);

    await agenda.every(
      config.get(`jobSchedule.${JobNames.SYNC_STATIONS}.schedule`),
      JobNames.SYNC_STATIONS,
    );
    await agenda.every(
      config.get(`jobSchedule.${JobNames.CLEANUP_OLD_STATIONS}.schedule`),
      JobNames.CLEANUP_OLD_STATIONS,
    );
  })();
}
