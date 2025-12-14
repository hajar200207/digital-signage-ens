// server.js
require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const bodyParser = require('body-parser')
const bcrypt = require('bcryptjs')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const app = express()
app.use(cors())
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))

// Servir les fichiers statiques
app.use(express.static('public'))
app.use('/uploads', express.static('uploads')) // Pour servir les fichiers uploadés

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = './uploads'
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configuration Multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

const fileFilter = (req, file, cb) => {
  // Accepter images, vidéos, PowerPoint
  const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|webm|pptx|ppt|pdf/
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedTypes.test(file.mimetype)
  
  if (mimetype && extname) {
    return cb(null, true)
  } else {
    cb(new Error('Type de fichier non supporté!'))
  }
}

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: fileFilter
})

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => console.error('❌ MongoDB erreur:', err))

// Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'editor' }
})

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

const User = mongoose.model('User', userSchema)

const slideSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['image', 'slideshow', 'video', 'weather', 'youtube', 'iframe', 'list', 'congratulations', 'pptx'],
    required: true
  },
  content: mongoose.Schema.Types.Mixed,
  duration: { type: Number, default: 10, min: 3, max: 300 },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  fileName: String, // Nom du fichier uploadé
  fileUrl: String, // URL du fichier
  settings: {
    autoPlay: { type: Boolean, default: true },
    loop: { type: Boolean, default: true },
    showTitle: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now }
})

const Slide = mongoose.model('Slide', slideSchema)

const Announcement = mongoose.model('Announcement', new mongoose.Schema({
  title: String,
  content: String,
  type: String,
  priority: { type: Number, default: 5 },
  startDate: Date,
  endDate: Date,
  isActive: { type: Boolean, default: true }
}))

// ===========================
// AUTH API
// ===========================

app.post('/api/auth/login', async (req, res) => {
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

// ===========================
// UPLOAD API
// ===========================

// Upload un seul fichier
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier uploadé' })
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    
    res.json({
      success: true,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileUrl: fileUrl,
      fileType: req.file.mimetype,
      fileSize: req.file.size
    })
  } catch (error) {
    console.error('Erreur upload:', error)
    res.status(500).json({ error: 'Erreur upload: ' + error.message })
  }
})

// Upload plusieurs fichiers (pour slideshow)
app.post('/api/upload-multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier uploadé' })
    }

    const files = req.files.map(file => ({
      fileName: file.originalname,
      filePath: file.path,
      fileUrl: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
      fileType: file.mimetype
    }))

    res.json({ success: true, files })
  } catch (error) {
    console.error('Erreur upload multiple:', error)
    res.status(500).json({ error: 'Erreur upload: ' + error.message })
  }
})

// ===========================
// SLIDES API
// ===========================

app.get('/api/slides', async (req, res) => {
  try {
    const slides = await Slide.find({ isActive: true }).sort({ order: 1 })
    res.json(slides)
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

app.post('/api/slides', async (req, res) => {
  try {
    const slide = new Slide(req.body)
    await slide.save()
    res.json(slide)
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

app.put('/api/slides/:id', async (req, res) => {
  try {
    const slide = await Slide.findByIdAndUpdate(req.params.id, req.body, { new: true })
    res.json(slide)
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

app.patch('/api/slides/:id/toggle', async (req, res) => {
  try {
    const slide = await Slide.findById(req.params.id)
    slide.isActive = !slide.isActive
    await slide.save()
    res.json(slide)
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

app.delete('/api/slides/:id', async (req, res) => {
  try {
    const slide = await Slide.findById(req.params.id)
    
    // Supprimer le fichier physique si existe
    if (slide.fileUrl) {
      const filename = path.basename(slide.fileUrl)
      const filePath = path.join('uploads', filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }
    
    await Slide.findByIdAndDelete(req.params.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ===========================
// ANNOUNCEMENTS API
// ===========================

app.get('/api/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ priority: -1 })
    res.json(announcements)
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

app.post('/api/announcements', async (req, res) => {
  try {
    const announcement = new Announcement(req.body)
    await announcement.save()
    res.json(announcement)
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

app.put('/api/announcements/:id', async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true })
    res.json(announcement)
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

app.patch('/api/announcements/:id/toggle', async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
    announcement.isActive = !announcement.isActive
    await announcement.save()
    res.json(announcement)
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

app.delete('/api/announcements/:id', async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// ===========================
// CRÉER ADMIN USER
// ===========================

async function createAdminUser() {
  const username = 'admin'
  const password = 'admin123'
  
  const existingUser = await User.findOne({ username })
  if (existingUser) {
    console.log('⚠️  User admin existe déjà')
    return
  }
  
  const hashedPassword = await bcrypt.hash(password, 10)
  const user = new User({
    username,
    password: hashedPassword,
    role: 'admin'
  })
  
  await user.save()
  console.log('✅ Admin user créé: admin / admin123')
}

// Lancer le serveur
app.listen(4000, async () => {
  console.log('🚀 Server running on http://localhost:4000')
  console.log('📁 Dossier uploads créé')
  
  try {
    await createAdminUser()
  } catch (error) {
    console.error('Erreur création user:', error)
  }
})