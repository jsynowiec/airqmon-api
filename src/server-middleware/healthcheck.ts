import * as express from 'express';

const app = express();

app.get('/__healthcheck', (_, res) => {
  res.sendStatus(200);
});

export default app;
