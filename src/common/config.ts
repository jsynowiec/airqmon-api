import * as convict from 'convict';
import { realpathSync, existsSync } from 'fs';
import { IAirlyKey } from 'data-provider/airly/key-registry';
import { JobNames } from 'common/types';

// mitigation: dokku sets empty PORT env var for worker process
if (process.env?.PORT === '') {
  delete process.env.PORT;
}

type ConfigSchema = {
  env: string;
  host: string;
  port: number;
  mongodb: string;
  cache: {
    ttl: {
      measurements: number;
    };
  };
  apiKeys: {
    airly: IAirlyKey;
  };
  jobSchedule: {
    [jobName in JobNames]: {
      schedule: string;
      healtcheck: string | null;
    };
  };
};

const config = convict<ConfigSchema>({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development'],
    default: 'development',
    env: 'NODE_ENV',
  },
  host: {
    doc: 'The IP address to bind.',
    format: 'ipaddress',
    default: '127.0.0.1',
    env: 'HOST',
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 8080,
    env: 'PORT',
  },
  mongodb: {
    doc: 'MongoDB connection string',
    format: '*',
    default: 'mongodb://127.0.0.1:27017/airqmon',
    env: 'MONGO_URL',
  },
  cache: {
    ttl: {
      measurements: {
        doc: 'How often saved measurements should be refreshed on request (seconds)',
        format: 'nat',
        default: 900,
      },
    },
  },
  apiKeys: {
    airly: {
      key: {
        format: String,
        default: null,
        env: 'AIRLY_API_KEY',
      },
      rateLimitDay: {
        format: 'nat',
        default: null,
        env: 'AIRLY_RATE_LIMIT_DAY',
      },
      rateLimitMinute: {
        format: 'nat',
        default: null,
        env: 'AIRLY_RATE_LIMIT_MINUTE',
      },
    },
  },
  jobSchedule: {
    [JobNames.SYNC_STATIONS]: {
      schedule: {
        default: '0 0 * * *',
      },
      healtcheck: {
        format: '*',
        default: null,
      },
    },
    [JobNames.CLEANUP_OLD_STATIONS]: {
      schedule: {
        default: '30 0 * * *',
      },
      healtcheck: {
        format: '*',
        default: null,
      },
    },
  },
});

const envConfigPath = realpathSync(__dirname.concat(`/../../../config/${config.get('env')}.json`));
if (existsSync(envConfigPath)) {
  config.loadFile(envConfigPath);
}

config.validate({ allowed: 'strict' });

export default config;
