const jwt = require('jsonwebtoken')
const User = require('../models/User')

// Middleware pour vérifier le token JWT
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    if (!token) return res.status(401).json({ error: 'Token manquant' })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.userId)
    if (!user) return res.status(401).json({ error: 'Utilisateur non trouvé' })

    req.user = user
    req.userId = user._id
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Token invalide' })
    if (error.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expiré' })
    res.status(500).json({ error: 'Erreur serveur' })
  }
}

// Middleware pour vérifier le rôle admin
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin uniquement' })
  next()
}

module.exports = { auth, adminOnly }
