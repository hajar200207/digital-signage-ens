const router = require('express').Router()
const Announcement = require('../models/Announcement')

router.get('/', async (req, res) => {
  res.json(await Announcement.find().sort({ createdAt: -1 }))
})

router.post('/', async (req, res) => {
  const a = new Announcement(req.body)
  await a.save()
  res.json(a)
})

router.delete('/:id', async (req, res) => {
  await Announcement.findByIdAndDelete(req.params.id)
  res.sendStatus(204)
})

module.exports = router
