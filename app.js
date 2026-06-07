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
const alertasRoute = require('./routes/alertasRoute');   // <-- nueva ruta
const clientsRoute = require('./routes/clientsRoute');

app.use('/api-prestamos/permission', permissionRoute);
app.use('/api-prestamos/roles', rolesRoute);
app.use('/api-prestamos/systemUsers', systemUsersRoute);
app.use('/api-prestamos/alertas', alertasRoute);          // <-- montar alertas
app.use('/api-prestamos/clients', clientsRoute); // clientes endpoints

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'Prestamos Backend API' });
});
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// ========================
// LISTADO DINÁMICO DE RUTAS
// ========================
const getRoutes = (stack, basePath = '') => {
  let routes = [];
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
      routes.push(`${methods} ${basePath}${layer.route.path}`);
    } else if (layer.name === 'router' && layer.handle.stack) {
      let newBasePath = basePath;
      if (layer.regexp.source !== '^\\/?(?=\\/|$)') {
        const pathPart = layer.regexp.source
          .replace(/\\\/?/g, '/')
          .replace(/\^|\$|\?|\?i|\\(?=[\/])/g, '')
          .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param');
        newBasePath += pathPart;
      }
      routes = routes.concat(getRoutes(layer.handle.stack, newBasePath));
    }
  }
  return routes;
};

const routesList = getRoutes(app._router.stack);
module.exports = { app, routesList };