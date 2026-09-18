import { getUserByToken } from '../services/authService.js';

/**
 * Middleware requiring valid authenticated session
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      error: 'Autentikasi diperlukan. Silakan login terlebih dahulu.'
    });
  }

  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      code: 'INVALID_SESSION',
      error: 'Sesi telah kedaluwarsa atau tidak valid. Silakan login kembali.'
    });
  }

  req.user = user;
  next();
}

/**
 * Middleware requiring user to be in 'approved' status
 */
export function requireApproved(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.status === 'pending') {
      return res.status(403).json({
        success: false,
        code: 'PENDING_APPROVAL',
        error: 'Akun Anda masih menunggu persetujuan Super Admin (tropicans@gmail.com)'
      });
    }

    if (req.user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        error: 'Akun Anda telah dinonaktifkan oleh administrator'
      });
    }

    if (req.user.status === 'approved') {
      return next();
    }

    return res.status(403).json({
      success: false,
      code: 'ACCESS_DENIED',
      error: 'Akses ditolak.'
    });
  });
}

/**
 * Middleware requiring user to have one of the allowed roles (or super_admin)
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    requireApproved(req, res, () => {
      // Super admin always has full privileges
      if (req.user.role === 'super_admin') {
        return next();
      }

      if (allowedRoles.includes(req.user.role)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        code: 'INSUFFICIENT_ROLE',
        error: `Akses ditolak. Halaman atau aksi ini memerlukan peran: ${allowedRoles.join(', ')}`
      });
    });
  };
}
