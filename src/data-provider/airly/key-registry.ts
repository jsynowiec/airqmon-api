import config from 'common/config';
import logger from 'common/logger.js';
import { IProviderAPIKey } from 'common/types';

export type KeyRateLimits = {
  exhausted: {
    second: number | null;
    minute: number | null;
    day: number | null;
  };
  limits: {
    second?: number;
    minute?: number;
    day?: number;
  };
  remaining: {
    second?: number;
    minute?: number;
    day?: number;
  };
};

export interface IAirlyKey extends IProviderAPIKey {
  key: string;
  rateLimitSecond?: number;
  rateLimitMinute?: number | null;
  rateLimitDay?: number | null;
}

export interface IAirlyKeyRegistryInitOptions {
  key: IAirlyKey;
}

export class AirlyKeyRegistry {
  private key: string;
  private rateLimits: KeyRateLimits;

  constructor({ key }: IAirlyKeyRegistryInitOptions) {
    this.key = key.key;
    const { rateLimitSecond, rateLimitDay = 1000, rateLimitMinute = 50 } = key;

    this.rateLimits = {
      limits: {
        second: rateLimitSecond,
        minute: rateLimitMinute,
        day: rateLimitDay,
      },
      remaining: {
        second: undefined,
        minute: undefined,
        day: undefined,
      },
      exhausted: {
        second: null,
        minute: null,
        day: null,
      },
    };
  }

  getKey(): string {
    this.checkRateLimits();

    const { day, minute, second } = this.rateLimits.exhausted;
    if ([day, minute, second].every((v) => v === null)) {
      return this.key;
    }

    throw new Error('Airly API key exhausted.');
  }

  updateRateLimits(
    remainingRateLimitDay?: number,
    remainingRateLimitMinute?: number,
    remainingRateLimitSecond?: number,
  ): void {
    if (remainingRateLimitDay == 5) {
      logger.warning('Daily rate limit exhausted.');
    }

    if (remainingRateLimitMinute == 5) {
      logger.warning('Per minute rate limit exhausted.');
    }

    if (remainingRateLimitSecond == 5) {
      logger.warning('Per second rate limit exhausted.');
    }

    // Update rate limits
    this.rateLimits = {
      ...this.rateLimits,
      remaining: {
        ...this.rateLimits.remaining,
        day: remainingRateLimitDay,
        minute: remainingRateLimitMinute,
        second: remainingRateLimitSecond,
      },
      exhausted: {
        // Save timestamp if rate limit was reached
        // We want to stop before we hit the limit, hence == 1
        day: remainingRateLimitDay === 1 ? new Date().getTime() : null,
        minute: remainingRateLimitMinute === 1 ? new Date().getTime() : null,
        second: remainingRateLimitSecond === 1 ? new Date().getTime() : null,
      },
    };
  }

  private checkRateLimits(): void {
    const now = new Date().getTime();

    const {
      day: exhaustedDayTimestamp,
      minute: exhaustedMinuteTimestamp,
      second: exhaustedSecondTimestamp,
    } = this.rateLimits.exhausted;

    if (exhaustedDayTimestamp !== null && exhaustedDayTimestamp + 60 * 60 * 24 < now) {
      this.rateLimits.exhausted.day = null;
    }

    if (exhaustedMinuteTimestamp !== null && exhaustedMinuteTimestamp + 60 * 60 < now) {
      this.rateLimits.exhausted.minute = null;
    }

    if (exhaustedSecondTimestamp !== null && exhaustedSecondTimestamp + 60 < now) {
      this.rateLimits.exhausted.second = null;
    }
  }
}

export const airlyApiKeyRegistry = new AirlyKeyRegistry({
  key: config.get('apiKeys.airly'),
});

export default airlyApiKeyRegistry;
