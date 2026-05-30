require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bearerToken = require('express-bearer-token');

const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log('');
  console.log('========== RUTAS DISPONIBLES ==========');
  console.log(' /permission');
  console.log(' /roles');
  console.log(' /systemUsers');
  console.log('====================================');
  console.log('DB => ' + process.env.DATABASE_URL);
  console.log(`Servidor en http://localhost:${PORT}`);
});
