import { createLogger, format, transports } from 'winston';
const { combine, timestamp, printf } = format;

const level = (() => {
  if (!!process.env.DEBUG == true) return 'debug';
  if (process.env.NODE_ENV == 'production') return 'info';

  return 'verbose';
})();

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} - ${level.toUpperCase()} - ${message}`;
});

const logger = createLogger({
  level,
  format: combine(timestamp(), logFormat),
  transports: [new transports.Console()],
});

export default logger;
