const mongoose = require('mongoose')

const slideSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['image', 'slideshow', 'video', 'weather', 'youtube', 'iframe', 'list', 'congratulations'],
    required: true
  },
  content: {
    // Pour images/videos: URL ou base64
    // Pour slideshows: array d'URLs
    // Pour iframe: URL du site
    // Pour liste: array d'objets
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  duration: {
    type: Number,
    default: 10, // secondes
    min: 3,
    max: 300
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    // Paramètres spécifiques au widget
    autoPlay: { type: Boolean, default: true },
    loop: { type: Boolean, default: true },
    showTitle: { type: Boolean, default: true },
    transition: { type: String, default: 'fade' },
    backgroundColor: String,
    textColor: String
  },
  schedule: {
    startDate: Date,
    endDate: Date,
    daysOfWeek: [Number], // 0=Dimanche, 1=Lundi, etc.
    startTime: String, // "09:00"
    endTime: String // "17:00"
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// Mise à jour auto de updatedAt
slideSchema.pre('save', function(next) {
  this.updatedAt = Date.now()
  next()
})

// Index pour tri
slideSchema.index({ isActive: 1, order: 1 })

module.exports = mongoose.model('Slide', slideSchema)