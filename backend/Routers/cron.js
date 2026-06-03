const express = require('express');
const router = express.Router();
const { refreshTokensFunction } = require('../Controllers/refreshToken');
const app = express();

// Define a route to trigger the cron job manually

app.get('/cron/refresh-tokens', async (req, res) => {
  try {
    // call the function you want the cron to run
    await refreshTokensFunction();
    res.status(200).send('Cron job ran successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error running cron job');
  }
});

module.exports = app;
