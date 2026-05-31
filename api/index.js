require('dotenv').config();
const pool = require('../config/dbConnection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const express = require('express');

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'Prestamos Backend API' });
});

// Login
app.post('/api-prestamos/systemUsers/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Usuario y contraseña requeridos',
        code: 400
      });
    }

    const result = await pool.query(
      `SELECT * FROM system_users WHERE username = $1 OR email = $1`,
      [username.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user) return res.status(401).json({
      success: false,
      message: 'Credenciales inválidas',
      code: 401
    });

    if (!user.active) return res.status(403).json({
      success: false,
      message: 'Usuario inactivo',
      code: 403
    });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({
      success: false,
      message: 'Credenciales inválidas',
      code: 401
    });

    // Get roles with permissions
    const rolesResult = await pool.query(`
      SELECT r.id, r.name, r.type, COALESCE(r.permissions, '[]'::jsonb) as permissions
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `, [user.id]);

    const rolesWithPermissions = rolesResult.rows.map(role => ({
      id: role.id,
      name: role.name,
      type: role.type,
      permissions: typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions
    }));

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        roles: rolesWithPermissions
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    delete user.password;

    res.json({
      success: true,
      message: 'Login exitoso!',
      code: 200,
      data: {
        ...user,
        roles: rolesWithPermissions,
        token
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      message: e.message,
      code: 500
    });
  }
});

module.exports = app;
