# Prestamos Backend

API de backend para el sistema de gestión de préstamos.

## Instalación

```bash
npm install
```

## Configuración

Crear `.env`:

```
DATABASE_URL=tu_supabase_url
JWT_SECRET=tu_secret_key
ADMIN_EMAIL=admin@prestamos.com
ADMIN_PASSWORD=admin123
PORT=3000
```

## Ejecutar

Desarrollo:
```bash
npm run dev
```

Producción:
```bash
npm start
```

## Seed Admin

```bash
node seedAdmin.js
```

## Rutas Disponibles

- `POST /api-prestamos/systemUsers/login` - Login
- `GET /api-prestamos/systemUsers` - Listar usuarios
- `POST /api-prestamos/systemUsers/create` - Crear usuario
