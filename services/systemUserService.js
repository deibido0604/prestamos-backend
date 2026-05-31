const pool = require('../config/dbConnection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
      const existing = await pool.query(
        `SELECT id FROM system_users WHERE username = $1 OR email = $2`,
        [param.username.toLowerCase(), param.email.toLowerCase()]
      );

      if (existing.rows.length) {
        return { code: 400, message: 'Usuario ya existe' };
      }

      const hashed = await bcrypt.hash(param.password, 10);

      const result = await pool.query(
        `INSERT INTO system_users 
        (username,email,password,name,last_name,phone,department,active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING id, username, email, name, last_name, active`,
        [
          param.username.toLowerCase(),
          param.email.toLowerCase(),
          hashed,
          param.name,
          param.lastName,
          param.phone,
          param.department,
          param.active ?? true
        ]
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

  return {
    getAllSystemUsers,
    createSystemUser,
    loginSystemUser
  };
}

module.exports = systemUserService();
