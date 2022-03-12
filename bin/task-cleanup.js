require('module-alias/register');

const { JobNames } = require('common/types');
const { agenda } = require('../out/src/worker');

agenda.once('ready', async () => {
  await agenda.now(JobNames.CLEANUP_OLD_STATIONS);
  process.exit(0);
});
