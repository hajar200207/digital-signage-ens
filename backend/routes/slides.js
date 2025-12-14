const express = require('express')
const router = express.Router()
const Slide = require('../models/Slide')
const { auth } = require('../middleware/auth')

// Fonction pour vérifier si un slide est dans son horaire
const isInSchedule = (slide) => {
  if (!slide.schedule) return true
  
  const now = new Date()
  const { startDate, endDate, daysOfWeek, startTime, endTime } = slide.schedule
  
  if (startDate && now < new Date(startDate)) return false
  if (endDate && now > new Date(endDate)) return false
  
  if (daysOfWeek && daysOfWeek.length > 0) {
    const currentDay = now.getDay()
    if (!daysOfWeek.includes(currentDay)) return false
  }
  
  if (startTime && endTime) {
    const currentTime = now.toTimeString().slice(0, 5)
    if (currentTime < startTime || currentTime > endTime) return false
  }
  
  return true
}

// GET /api/slides - Lister les slides actifs
router.get('/', async (req, res) => {
  try {
    const slides = await Slide.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
    
    const activeSlides = slides.filter(isInSchedule)
    
    res.json(activeSlides)
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur: ' + error.message })
  }
})

// GET /api/slides/all - Tous les slides
router.get('/all', auth, async (req, res) => {
  try {
    const slides = await Slide.find()
      .sort({ order: 1 })
      .populate('createdBy', 'username')
    
    res.json(slides)
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur: ' + error.message })
  }
})

// GET /api/slides/:id - Détails d'un slide
router.get('/:id', async (req, res) => {
  try {
    const slide = await Slide.findById(req.params.id)
    if (!slide) {
      return res.status(404).json({ error: 'Slide non trouvé' })
    }
    res.json(slide)
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur: ' + error.message })
  }
})

// POST /api/slides - Créer un slide
router.post('/', auth, async (req, res) => {
  try {
    const slide = new Slide({
      ...req.body,
      createdBy: req.userId
    })
    await slide.save()
    res.status(201).json(slide)
  } catch (error) {
    res.status(500).json({ error: 'Erreur création: ' + error.message })
  }
})

// PUT /api/slides/:id - Modifier un slide
router.put('/:id', auth, async (req, res) => {
  try {
    const slide = await Slide.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    
    if (!slide) {
      return res.status(404).json({ error: 'Slide non trouvé' })
    }
    
    res.json(slide)
  } catch (error) {
    res.status(500).json({ error: 'Erreur modification: ' + error.message })
  }
})

// DELETE /api/slides/:id - Supprimer un slide
router.delete('/:id', auth, async (req, res) => {
  try {
    const slide = await Slide.findByIdAndDelete(req.params.id)
    
    if (!slide) {
      return res.status(404).json({ error: 'Slide non trouvé' })
    }
    
    res.json({ message: 'Slide supprimé avec succès' })
  } catch (error) {
    res.status(500).json({ error: 'Erreur suppression: ' + error.message })
  }
})

// PATCH /api/slides/:id/toggle - Activer/Désactiver
router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    const slide = await Slide.findById(req.params.id)
    
    if (!slide) {
      return res.status(404).json({ error: 'Slide non trouvé' })
    }
    
    slide.isActive = !slide.isActive
    await slide.save()
    
    res.json(slide)
  } catch (error) {
    res.status(500).json({ error: 'Erreur: ' + error.message })
  }
})

// PATCH /api/slides/reorder - Réorganiser les slides
router.patch('/reorder', auth, async (req, res) => {
  try {
    const { slides } = req.body
    
    const updates = slides.map((id, index) => 
      Slide.findByIdAndUpdate(id, { order: index })
    )
    
    await Promise.all(updates)
    
    res.json({ message: 'Ordre mis à jour' })
  } catch (error) {
    res.status(500).json({ error: 'Erreur: ' + error.message })
  }
})

// IMPORTANT: Exporter le router
module.exports = router