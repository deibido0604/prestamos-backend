require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bearerToken = require('express-bearer-token');

const app = express();

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bearerToken());

// Routes
const permissionRoute = require('./routes/permissionRoute');
const rolesRoute = require('./routes/rolesRoute');
const systemUsersRoute = require('./routes/systemUsersRoute');

app.use('/api-prestamos/permission', permissionRoute);
app.use('/api-prestamos/roles', rolesRoute);
app.use('/api-prestamos/systemUsers', systemUsersRoute);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

module.exports = app;
