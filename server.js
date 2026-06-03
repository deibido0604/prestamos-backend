require('dotenv').config();
const { app, routesList } = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log('');
  console.log('========== RUTAS DISPONIBLES ==========');
  routesList.forEach(route => console.log(` ${route}`));
  console.log('========================================');
  console.log(`DB => ${process.env.DATABASE_URL}`);
  console.log(`Servidor en http://localhost:${PORT}`);
});