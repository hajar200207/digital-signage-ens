require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI)

  // Vérifier si admin existe déjà
  const existing = await User.findOne({ username: 'admin' })
  if (existing) {
    console.log('⚠️ Admin déjà existant:', existing.username)
    process.exit()
  }

  const admin = new User({
    username: 'admin',
    password: 'admin123',
    role: 'admin'
  })

  await admin.save()
  console.log('✅ Admin créé: admin / admin123')
  process.exit()
}

createAdmin()
