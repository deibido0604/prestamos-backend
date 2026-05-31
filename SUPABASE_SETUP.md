# 📋 Instrucciones para inicializar Supabase

## Paso 1: Abre SQL Editor en Supabase
1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto **Prestamos**
3. En el sidebar, haz click en **SQL Editor**

## Paso 2: Copia y ejecuta el script SQL
1. Haz click en **New Query**
2. Copia el contenido de `supabase_init.sql`
3. Pégalo en el editor
4. Haz click en **Run** (o presiona Ctrl+Enter)

## Script SQL:

```sql
-- Run this in Supabase SQL Editor to initialize the database

-- Create extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create system_users table
CREATE TABLE IF NOT EXISTS system_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  last_name TEXT,
  phone TEXT,
  department TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT,
  type TEXT,
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT now()
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES system_users(id) ON DELETE CASCADE,
  role_id INT REFERENCES roles(id) ON DELETE CASCADE
);

-- Insert Admin role with permissions
INSERT INTO roles (name, type, permissions) VALUES (
  'Admin',
  'admin',
  '[
    {"action": "read", "subject": "main"},
    {"action": "read", "subject": "dashboard"},
    {"action": "read", "subject": "clientes"},
    {"action": "create", "subject": "clientes"},
    {"action": "update", "subject": "clientes"},
    {"action": "delete", "subject": "clientes"},
    {"action": "read", "subject": "prestamos"},
    {"action": "create", "subject": "prestamos"},
    {"action": "update", "subject": "prestamos"},
    {"action": "delete", "subject": "prestamos"},
    {"action": "read", "subject": "administracion"},
    {"action": "create", "subject": "administracion"},
    {"action": "update", "subject": "administracion"},
    {"action": "delete", "subject": "administracion"},
    {"action": "read", "subject": "reports"},
    {"action": "create", "subject": "reports"},
    {"action": "delete", "subject": "reports"},
    {"action": "read", "subject": "alertas"},
    {"action": "create", "subject": "alertas"},
    {"action": "update", "subject": "alertas"},
    {"action": "delete", "subject": "alertas"}
  ]'::jsonb
) ON CONFLICT DO NOTHING;

-- Insert Admin user (password: admin123)
INSERT INTO system_users (username, email, password, name, active) VALUES (
  'admin',
  'admin@prestamos.com',
  '$2a$10$9s/oAVZDmr.A9/5/7R8bQer6B5XYI6mEyWNRvlA1j.4d2e8U3sxWW',
  'Administrador',
  true
) ON CONFLICT (email) DO NOTHING;

-- Link admin user to admin role
INSERT INTO user_roles (user_id, role_id) 
SELECT su.id, r.id FROM system_users su, roles r 
WHERE su.email = 'admin@prestamos.com' AND r.type = 'admin'
ON CONFLICT DO NOTHING;

SELECT 'Database initialized!' as status;
```

## Credenciales de prueba:
- **Usuario:** admin
- **Contraseña:** admin123
- **Email:** admin@prestamos.com

Una vez ejecutado, el backend en Vercel podrá conectarse a Supabase y responder el login.
