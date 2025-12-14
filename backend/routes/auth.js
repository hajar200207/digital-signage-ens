// routes/auth.js
const express = require('express')
const router = express.Router()
const User = require('../models/User')
const bcrypt = require('bcryptjs')

// POST /login - Sans JWT, juste vérification
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    
    const user = await User.findOne({ username })
    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides' })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Identifiants invalides' })
    }

    // Renvoyer juste l'utilisateur, pas de token
    res.json({ 
      user: { 
        id: user._id, 
        username: user.username, 
        role: user.role 
      } 
    })
  } catch (error) {
    console.error('Erreur login:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

module.exports = router