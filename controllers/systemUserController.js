const systemUserService = require('../services/systemUserService');

function systemUserController() {

  async function getAllSystemUsers(req, res) {
    try {
      const skip = req.query.skip || 0;
      const limit = req.query.limit || 10;
      const active = req.query.active;

      const result = await systemUserService.getAllSystemUsers(skip, limit, active);

      res.json({
        success: true,
        message: 'Usuarios obtenidos',
        code: 200,
        data: result
      });
    } catch (e) {
      res.status(500).json({
        success: false,
        message: e.message,
        code: 500
      });
    }
  }

  async function createSystemUser(req, res) {
    try {
      const { username, email, password, name, lastName, phone, department, active } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Faltan campos requeridos',
          code: 400
        });
      }

      const result = await systemUserService.createSystemUser({
        username,
        email,
        password,
        name,
        lastName,
        phone,
        department,
        active
      });

      if (result.code && result.code !== 200) {
        return res.status(result.code).json({
          success: false,
          message: result.message,
          code: result.code
        });
      }

      res.json({
        success: true,
        message: 'Usuario creado',
        code: 200,
        data: result
      });
    } catch (e) {
      res.status(500).json({
        success: false,
        message: e.message,
        code: 500
      });
    }
  }

  async function login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Usuario y contraseña requeridos',
          code: 400
        });
      }

      const result = await systemUserService.loginSystemUser(username, password);

      if (result.code && result.code !== 200 && result.code !== undefined) {
        return res.status(result.code).json({
          success: false,
          message: result.message,
          code: result.code
        });
      }

      res.json({
        success: true,
        message: 'Login exitoso!',
        code: 200,
        data: result
      });
    } catch (e) {
      console.error('Login error details:', e);
      res.status(500).json({
        success: false,
        message: e.message,
        code: 500
      });
    }
  }

  return {
    getAllSystemUsers,
    createSystemUser,
    login
  };
}

module.exports = systemUserController();
