const pool = require('../config/dbConnection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const isDev = process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL;

// Crear tablas en SQLite local si no existen
const initResetTable = async () => {
  if (!isDev) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT,
      last_name TEXT,
      phone TEXT,
      department TEXT,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0
    )
  `);
};
initResetTable().catch(console.error);

function systemUserService() {

  async function getAllSystemUsers(skip = 0, limit = 10, active) {
    try {
      const query = `
        SELECT 
          su.*,
          COALESCE(
            json_agg(
              json_build_object('id', r.id, 'name', r.name, 'type', r.type)
            ) FILTER (WHERE r.id IS NOT NULL),
            '[]'
          ) as roles
        FROM system_users su
        LEFT JOIN user_roles ur ON su.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        ${active !== undefined ? `WHERE su.active = $1` : ''}
        GROUP BY su.id
        ORDER BY su.created_at DESC
        LIMIT $${active !== undefined ? 2 : 1}
        OFFSET $${active !== undefined ? 3 : 2}
      `;

      const params = [];
      if (active !== undefined) params.push(active === 'true');
      params.push(limit, skip);

      const result = await pool.query(query, params);
      return result.rows;

    } catch (e) {
      console.error(e);
      return { code: 500, message: e.message };
    }
  }

  async function createSystemUser(param) {
    try {
      // Generar username desde nombre + prefijo del correo si no viene
      let username = param.username;
      if (!username) {
        const namePart = (param.name || '').toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
        const emailPrefix = param.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        const base = namePart || emailPrefix;
        // Asegurar unicidad con sufijo numérico si ya existe
        let candidate = base;
        let suffix = 1;
        while (true) {
          const exists = await pool.query('SELECT id FROM system_users WHERE username = $1', [candidate]);
          if (!exists.rows.length) break;
          candidate = `${base}${suffix++}`;
        }
        username = candidate;
      }

      const existing = await pool.query(
        `SELECT id FROM system_users WHERE username = $1 OR email = $2`,
        [username.toLowerCase(), param.email.toLowerCase()]
      );

      if (existing.rows.length) {
        return { code: 400, message: 'Usuario ya existe' };
      }

      const hashed = await bcrypt.hash(param.password, 10);
      const fullName = [param.name, param.lastName].filter(Boolean).join(' ') || param.name || '';

      const result = await pool.query(
        `INSERT INTO system_users (username, email, password, full_name, active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, email, full_name, active`,
        [username.toLowerCase(), param.email.toLowerCase(), hashed, fullName, param.active ?? true]
      );

      return result.rows[0];

    } catch (e) {
      console.error(e);
      return { code: 500, message: e.message };
    }
  }

  async function loginSystemUser(username, password) {
    try {
      const result = await pool.query(
        `SELECT * FROM system_users WHERE username = $1 OR email = $1`,
        [username.toLowerCase()]
      );

      const user = result.rows[0];
      if (!user) return { code: 401, message: 'Credenciales inválidas' };

      if (!user.active) return { code: 403, message: 'Usuario inactivo' };

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return { code: 401, message: 'Credenciales inválidas' };

      // 🔥 Obtener roles con permisos
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

      return {
        ...user,
        roles: rolesWithPermissions,
        token
      };

    } catch (e) {
      console.error(e);
      return { code: 500, message: e.message };
    }
  }

  // dentro de systemUserService(), después de loginSystemUser

  async function updateSystemUser(id, updates) {
    try {
      const { name, lastName, phone, active } = updates;
      const fullName = [name, lastName].filter(Boolean).join(' ') || name || undefined;
      const result = await pool.query(
        `UPDATE system_users 
         SET full_name = COALESCE($1, full_name),
             active    = COALESCE($2, active),
             updated_at = NOW()
         WHERE id = $3
         RETURNING id, username, email, full_name, active, created_at, updated_at`,
        [fullName ?? null, active ?? null, id]
      );
      if (result.rows.length === 0) return { code: 404, message: 'Usuario no encontrado' };
      return result.rows[0];
    } catch (e) {
      console.error(e);
      return { code: 500, message: e.message };
    }
  }

  async function deleteSystemUser(id) {
    try {
      const result = await pool.query('DELETE FROM system_users WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) return { code: 404, message: 'Usuario no encontrado' };
      return { success: true };
    } catch (e) {
      console.error(e);
      return { code: 500, message: e.message };
    }
  }

  async function generateResetToken(userId, isNewUser = false) {
    try {
      const user = await pool.query('SELECT id, email, full_name, username FROM system_users WHERE id = $1', [userId]);
      if (!user.rows.length) return { code: 404, message: 'Usuario no encontrado' };

      await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await pool.query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
        [userId, token, expiresAt]
      );

      // Enviar correo
      const { email, full_name, username } = user.rows[0];
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;
      const displayName = full_name || username || email;

      try {
        const { sendEmail } = require('./emailService');
        const subject = isNewUser
          ? 'Bienvenido — Establece tu contraseña'
          : 'Restablecimiento de contraseña';

        const html = isNewUser
          ? `
            <h2>¡Bienvenido al Sistema de Préstamos, ${displayName}!</h2>
            <p>Tu cuenta ha sido creada. Haz clic en el siguiente enlace para establecer tu contraseña:</p>
            <p><a href="${resetUrl}" style="background:#1677ff;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;">Establecer contraseña</a></p>
            <p>Este enlace expira en <strong>1 hora</strong>.</p>
            <p>Si no esperabas este correo, ignóralo.</p>
          `
          : `
            <h2>Restablecimiento de contraseña</h2>
            <p>Hola ${displayName}, recibiste este correo porque se solicitó restablecer tu contraseña.</p>
            <p><a href="${resetUrl}" style="background:#1677ff;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;">Restablecer contraseña</a></p>
            <p>Este enlace expira en <strong>1 hora</strong>.</p>
            <p>Si no solicitaste esto, ignora este correo.</p>
          `;

        await sendEmail(email, subject, html);
      } catch (emailErr) {
        // No fallar si el correo no se puede enviar — el token sigue siendo válido
        console.error('⚠️  Email no enviado:', emailErr.message);
      }

      return { token, expiresAt, email };
    } catch (e) {
      console.error(e);
      return { code: 500, message: e.message };
    }
  }

  async function resetPassword(token, newPassword) {
    try {
      const result = await pool.query(
        `SELECT * FROM password_reset_tokens WHERE token = $1 AND used = FALSE`,
        [token]
      );

      if (!result.rows.length) return { code: 400, message: 'Token inválido o ya utilizado' };

      const record = result.rows[0];
      if (new Date(record.expires_at) < new Date()) {
        return { code: 400, message: 'El token ha expirado' };
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE system_users SET password = $1 WHERE id = $2', [hashed, record.user_id]);
      await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [token]);

      return { success: true };
    } catch (e) {
      console.error(e);
      return { code: 500, message: e.message };
    }
  }

  async function validateResetToken(token) {
    try {
      const result = await pool.query(
        `SELECT prt.*, su.email, su.username FROM password_reset_tokens prt
         JOIN system_users su ON su.id = prt.user_id
         WHERE prt.token = $1 AND prt.used = FALSE`,
        [token]
      );
      if (!result.rows.length) return { code: 400, message: 'Token inválido' };
      const record = result.rows[0];
      if (new Date(record.expires_at) < new Date()) return { code: 400, message: 'Token expirado' };
      return { valid: true, email: record.email, username: record.username };
    } catch (e) {
      return { code: 500, message: e.message };
    }
  }

  return {
    getAllSystemUsers,
    createSystemUser,
    loginSystemUser,
    updateSystemUser,
    deleteSystemUser,
    generateResetToken,
    resetPassword,
    validateResetToken,
  };
}

module.exports = systemUserService();
