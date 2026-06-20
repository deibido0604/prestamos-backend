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

      if (!email || !password) {
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

  async function updateSystemUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const result = await systemUserService.updateSystemUser(id, updates);
      if (result.code && result.code !== 200) {
        return res.status(result.code).json({ success: false, message: result.message, code: result.code });
      }
      res.json({ success: true, message: 'Usuario actualizado', code: 200, data: result });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message, code: 500 });
    }
  }

  async function deleteSystemUser(req, res) {
    try {
      const { id } = req.params;
      const result = await systemUserService.deleteSystemUser(id);
      if (result.code && result.code !== 200) {
        return res.status(result.code).json({ success: false, message: result.message, code: result.code });
      }
      res.json({ success: true, message: 'Usuario eliminado', code: 200 });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message, code: 500 });
    }
  }

  async function generateResetToken(req, res) {
    try {
      const { id } = req.params;
      const result = await systemUserService.generateResetToken(id);
      if (result.code) return res.status(result.code).json({ success: false, message: result.message });
      res.json({ success: true, data: result });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  async function validateResetToken(req, res) {
    try {
      const { token } = req.params;
      const result = await systemUserService.validateResetToken(token);
      if (result.code) return res.status(result.code).json({ success: false, message: result.message });
      res.json({ success: true, data: result });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  async function resetPassword(req, res) {
    try {
      const { token } = req.params;
      const { password } = req.body;
      if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });
      }
      const result = await systemUserService.resetPassword(token, password);
      if (result.code) return res.status(result.code).json({ success: false, message: result.message });
      res.json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  return {
    getAllSystemUsers,
    createSystemUser,
    login,
    updateSystemUser,
    deleteSystemUser,
    generateResetToken,
    validateResetToken,
    resetPassword,
  };
}

module.exports = systemUserController();
