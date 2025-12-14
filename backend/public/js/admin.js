// Configuration API
const API_URL = 'http://localhost:4000/api'

// État global
let currentUser = null
let uploadedFileUrl = null
let uploadedFiles = [] // Pour slideshow

// ======================
// AUTH FUNCTIONS
// ======================

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  
  const username = document.getElementById('username').value
  const password = document.getElementById('password').value
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    
    const data = await response.json()
    
    if (response.ok) {
      currentUser = data.user
      showDashboard()
    } else {
      showError(data.error)
    }
  } catch (error) {
    showError('Erreur de connexion au serveur')
  }
})

function logout() {
  currentUser = null
  document.getElementById('loginPage').style.display = 'flex'
  document.getElementById('adminDashboard').style.display = 'none'
}

function showDashboard() {
  document.getElementById('loginPage').style.display = 'none'
  document.getElementById('adminDashboard').style.display = 'block'
  document.getElementById('userInfo').textContent = `👤 ${currentUser.username}`
  loadSlides()
  loadAnnouncements()
}

function showError(message) {
  const errorDiv = document.getElementById('loginError')
  errorDiv.textContent = message
  errorDiv.style.display = 'block'
  setTimeout(() => {
    errorDiv.style.display = 'none'
  }, 3000)
}

// ======================
// TABS
// ======================

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'))
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'))
  
  event.target.classList.add('active')
  document.getElementById(`${tab}Tab`).classList.add('active')
}

// ======================
// FILE UPLOAD
// ======================

// Upload un seul fichier (image, vidéo, pptx)
async function uploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData
    })
    
    const data = await response.json()
    
    if (response.ok) {
      return data.fileUrl
    } else {
      alert('Erreur upload: ' + data.error)
      return null
    }
  } catch (error) {
    alert('Erreur upload: ' + error.message)
    return null
  }
}

// Upload plusieurs fichiers (slideshow)
async function uploadMultipleFiles(files) {
  const formData = new FormData()
  
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i])
  }
  
  try {
    const response = await fetch(`${API_URL}/upload-multiple`, {
      method: 'POST',
      body: formData
    })
    
    const data = await response.json()
    
    if (response.ok) {
      return data.files.map(f => f.fileUrl)
    } else {
      alert('Erreur upload: ' + data.error)
      return []
    }
  } catch (error) {
    alert('Erreur upload: ' + error.message)
    return []
  }
}

// Gérer le changement de type de widget
document.getElementById('slideType').addEventListener('change', (e) => {
  const type = e.target.value
  const uploadSection = document.getElementById('uploadSection')
  const singleFileSection = document.getElementById('singleFileSection')
  const multiFileSection = document.getElementById('multiFileSection')
  const manualContentSection = document.getElementById('manualContentSection')
  const contentField = document.getElementById('slideContent')
  
  // Reset
  uploadSection.style.display = 'none'
  singleFileSection.style.display = 'none'
  multiFileSection.style.display = 'none'
  manualContentSection.style.display = 'none'
  
  // Types avec upload de fichiers
  if (['image', 'video', 'pptx'].includes(type)) {
    uploadSection.style.display = 'block'
    singleFileSection.style.display = 'block'
    manualContentSection.style.display = 'block'
    contentField.placeholder = 'URL sera générée automatiquement après upload'
    contentField.required = false
  } 
  // Slideshow - upload multiple
  else if (type === 'slideshow') {
    uploadSection.style.display = 'block'
    multiFileSection.style.display = 'block'
    manualContentSection.style.display = 'block'
    contentField.placeholder = 'Les URLs seront générées après upload des images'
    contentField.required = false
  } 
  // Autres types - saisie manuelle
  else {
    manualContentSection.style.display = 'block'
    contentField.placeholder = getPlaceholderForType(type)
    contentField.required = true
  }
})

function getPlaceholderForType(type) {
  const placeholders = {
    youtube: 'ID de la vidéo YouTube (ex: dQw4w9WgXcQ)',
    iframe: 'URL du site web (ex: https://google.com)',
    weather: '{"city": "Rabat", "country": "MA"}',
    list: '[{"nom": "Salle 1", "info": "Disponible"}]',
    congratulations: '{"title": "Félicitations!", "message": "Bravo à tous!"}'
  }
  return placeholders[type] || ''
}

// Upload fichier unique
document.getElementById('fileUpload').addEventListener('change', async (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  const uploadStatus = document.getElementById('uploadStatus')
  uploadStatus.textContent = '⏳ Upload en cours... (' + (file.size / 1024 / 1024).toFixed(2) + ' MB)'
  uploadStatus.style.display = 'block'
  uploadStatus.style.background = '#fff3cd'
  uploadStatus.style.color = '#856404'
  
  const fileUrl = await uploadFile(file)
  
  if (fileUrl) {
    uploadedFileUrl = fileUrl
    document.getElementById('slideContent').value = fileUrl
    uploadStatus.textContent = '✅ Fichier uploadé avec succès: ' + file.name
    uploadStatus.style.background = '#d4edda'
    uploadStatus.style.color = '#155724'
    
    // Auto-remplir le titre si vide
    if (!document.getElementById('slideTitle').value) {
      document.getElementById('slideTitle').value = file.name.replace(/\.[^/.]+$/, '')
    }
  } else {
    uploadStatus.textContent = '❌ Erreur lors de l\'upload'
    uploadStatus.style.background = '#f8d7da'
    uploadStatus.style.color = '#721c24'
  }
})

// Upload fichiers multiples (slideshow)
document.getElementById('multiFileUpload').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files)
  if (files.length === 0) return
  
  const uploadStatus = document.getElementById('uploadStatus')
  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  uploadStatus.textContent = `⏳ Upload de ${files.length} fichiers... (${(totalSize / 1024 / 1024).toFixed(2)} MB)`
  uploadStatus.style.display = 'block'
  uploadStatus.style.background = '#fff3cd'
  uploadStatus.style.color = '#856404'
  
  const fileUrls = await uploadMultipleFiles(files)
  
  if (fileUrls.length > 0) {
    uploadedFiles = fileUrls
    document.getElementById('slideContent').value = JSON.stringify(fileUrls, null, 2)
    uploadStatus.textContent = `✅ ${fileUrls.length} fichiers uploadés avec succès`
    uploadStatus.style.background = '#d4edda'
    uploadStatus.style.color = '#155724'
    
    // Auto-remplir le titre si vide
    if (!document.getElementById('slideTitle').value) {
      document.getElementById('slideTitle').value = 'Slideshow - ' + new Date().toLocaleDateString()
    }
  } else {
    uploadStatus.textContent = '❌ Erreur lors de l\'upload'
    uploadStatus.style.background = '#f8d7da'
    uploadStatus.style.color = '#721c24'
  }
})

// ======================
// SLIDES/WIDGETS
// ======================

async function loadSlides() {
  try {
    const response = await fetch(`${API_URL}/slides`)
    const slides = await response.json()
    displaySlides(slides)
  } catch (error) {
    console.error('Erreur chargement slides:', error)
  }
}

function displaySlides(slides) {
  const container = document.getElementById('slidesList')
  
  if (slides.length === 0) {
    container.innerHTML = '<p>Aucun widget pour le moment</p>'
    return
  }
  
  container.innerHTML = slides.map(slide => `
    <div class="item-card">
      <div class="item-header">
        <div>
          <h3>${slide.title}</h3>
          <p style="color: #666; font-size: 14px;">${getTypeLabel(slide.type)}</p>
        </div>
        <span class="item-badge ${slide.isActive ? 'badge-active' : 'badge-inactive'}">
          ${slide.isActive ? 'Actif' : 'Inactif'}
        </span>
      </div>
      ${slide.fileName ? `<p style="font-size: 12px; color: #999;">📎 ${slide.fileName}</p>` : ''}
      <p style="font-size: 13px; color: #999;">Durée: ${slide.duration}s | Ordre: ${slide.order}</p>
      <div class="item-actions">
        <button class="btn-small btn-edit" onclick='editSlide(${JSON.stringify(slide).replace(/'/g, "&#39;")})'>Modifier</button>
        <button class="btn-small btn-toggle" onclick="toggleSlide('${slide._id}')">Activer/Désactiver</button>
        <button class="btn-small btn-delete" onclick="deleteSlide('${slide._id}')">Supprimer</button>
      </div>
    </div>
  `).join('')
}

function getTypeLabel(type) {
  const labels = {
    image: '🖼️ Image',
    slideshow: '🎬 Slideshow',
    video: '🎥 Vidéo',
    weather: '☀️ Météo',
    youtube: '▶️ YouTube',
    iframe: '🌐 Site Web',
    list: '📋 Liste',
    congratulations: '🎉 Félicitations',
    pptx: '📊 PowerPoint'
  }
  return labels[type] || type
}

function openSlideModal(slide = null) {
  document.getElementById('slideModal').classList.add('show')
  uploadedFileUrl = null
  uploadedFiles = []
  
  // Reset form
  document.getElementById('uploadStatus').style.display = 'none'
  document.getElementById('fileUpload').value = ''
  document.getElementById('multiFileUpload').value = ''
  
  if (slide) {
    document.getElementById('slideModalTitle').textContent = 'Modifier Widget'
    document.getElementById('slideId').value = slide._id
    document.getElementById('slideTitle').value = slide.title
    document.getElementById('slideType').value = slide.type
    document.getElementById('slideDuration').value = slide.duration
    document.getElementById('slideContent').value = typeof slide.content === 'object' 
      ? JSON.stringify(slide.content, null, 2) 
      : slide.content
    
    // Trigger change event pour afficher les bons champs
    document.getElementById('slideType').dispatchEvent(new Event('change'))
  } else {
    document.getElementById('slideModalTitle').textContent = 'Nouveau Widget'
    document.getElementById('slideForm').reset()
    document.getElementById('slideId').value = ''
    
    // Par défaut afficher la section upload
    document.getElementById('uploadSection').style.display = 'block'
    document.getElementById('singleFileSection').style.display = 'block'
    document.getElementById('manualContentSection').style.display = 'block'
  }
}

function closeSlideModal() {
  document.getElementById('slideModal').classList.remove('show')
}

function editSlide(slide) {
  openSlideModal(slide)
}

document.getElementById('slideForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  
  const id = document.getElementById('slideId').value
  const type = document.getElementById('slideType').value
  let content = document.getElementById('slideContent').value
  
  try {
    content = JSON.parse(content)
  } catch (e) {
    // Garder comme string si pas JSON
  }
  
  const slideData = {
    title: document.getElementById('slideTitle').value,
    type: type,
    duration: parseInt(document.getElementById('slideDuration').value),
    content: content,
    fileUrl: uploadedFileUrl,
    fileName: uploadedFileUrl ? document.getElementById('fileUpload').files[0]?.name : null
  }
  
  try {
    const url = id ? `${API_URL}/slides/${id}` : `${API_URL}/slides`
    const method = id ? 'PUT' : 'POST'
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slideData)
    })
    
    if (response.ok) {
      closeSlideModal()
      loadSlides()
    } else {
      const data = await response.json()
      alert('Erreur: ' + data.error)
    }
  } catch (error) {
    alert('Erreur de connexion')
  }
})

async function toggleSlide(id) {
  try {
    const response = await fetch(`${API_URL}/slides/${id}/toggle`, {
      method: 'PATCH'
    })
    
    if (response.ok) {
      loadSlides()
    }
  } catch (error) {
    console.error('Erreur:', error)
  }
}

async function deleteSlide(id) {
  if (!confirm('Supprimer ce widget ?')) return
  
  try {
    const response = await fetch(`${API_URL}/slides/${id}`, {
      method: 'DELETE'
    })
    
    if (response.ok) {
      loadSlides()
    }
  } catch (error) {
    console.error('Erreur:', error)
  }
}

// ======================
// ANNOUNCEMENTS (même code qu'avant)
// ======================

async function loadAnnouncements() {
  try {
    const response = await fetch(`${API_URL}/announcements`)
    const announcements = await response.json()
    displayAnnouncements(announcements)
  } catch (error) {
    console.error('Erreur chargement annonces:', error)
  }
}

function displayAnnouncements(announcements) {
  const container = document.getElementById('announcementsList')
  
  if (announcements.length === 0) {
    container.innerHTML = '<p>Aucune annonce pour le moment</p>'
    return
  }
  
  container.innerHTML = announcements.map(announcement => `
    <div class="item-card">
      <div class="item-header">
        <div>
          <h3>${announcement.title}</h3>
          <p style="color: #666; font-size: 14px;">${getAnnouncementTypeLabel(announcement.type)}</p>
        </div>
        <span class="item-badge ${announcement.isActive ? 'badge-active' : 'badge-inactive'}">
          ${announcement.isActive ? 'Actif' : 'Inactif'}
        </span>
      </div>
      <p style="font-size: 13px; margin-top: 10px;">${announcement.content.substring(0, 100)}...</p>
      <p style="font-size: 12px; color: #999; margin-top: 8px;">
        ${new Date(announcement.startDate).toLocaleDateString()} → ${new Date(announcement.endDate).toLocaleDateString()}
      </p>
      <div class="item-actions">
        <button class="btn-small btn-edit" onclick='editAnnouncement(${JSON.stringify(announcement).replace(/'/g, "&#39;")})'>Modifier</button>
        <button class="btn-small btn-toggle" onclick="toggleAnnouncement('${announcement._id}')'>Activer/Désactiver</button>
        <button class="btn-small btn-delete" onclick="deleteAnnouncement('${announcement._id}')">Supprimer</button>
      </div>
    </div>
  `).join('')
}

function getAnnouncementTypeLabel(type) {
  const labels = {
    info: 'ℹ️ Information',
    urgent: '🚨 Urgent',
    event: '📅 Événement',
    congratulations: '🎉 Félicitations'
  }
  return labels[type] || type
}

function openAnnouncementModal(announcement = null) {
  document.getElementById('announcementModal').classList.add('show')
  
  if (announcement) {
    document.getElementById('announcementModalTitle').textContent = 'Modifier Annonce'
    document.getElementById('announcementId').value = announcement._id
    document.getElementById('announcementTitle').value = announcement.title
    document.getElementById('announcementContent').value = announcement.content
    document.getElementById('announcementType').value = announcement.type
    document.getElementById('announcementPriority').value = announcement.priority
    document.getElementById('announcementStart').value = new Date(announcement.startDate).toISOString().slice(0, 16)
    document.getElementById('announcementEnd').value = new Date(announcement.endDate).toISOString().slice(0, 16)
  } else {
    document.getElementById('announcementModalTitle').textContent = 'Nouvelle Annonce'
    document.getElementById('announcementForm').reset()
    document.getElementById('announcementId').value = ''
    
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 7)
    document.getElementById('announcementStart').value = now.toISOString().slice(0, 16)
    document.getElementById('announcementEnd').value = tomorrow.toISOString().slice(0, 16)
  }
}

function closeAnnouncementModal() {
  document.getElementById('announcementModal').classList.remove('show')
}

function editAnnouncement(announcement) {
  openAnnouncementModal(announcement)
}

document.getElementById('announcementForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  
  const id = document.getElementById('announcementId').value
  
  const announcementData = {
    title: document.getElementById('announcementTitle').value,
    content: document.getElementById('announcementContent').value,
    type: document.getElementById('announcementType').value,
    priority: parseInt(document.getElementById('announcementPriority').value),
    startDate: document.getElementById('announcementStart').value,
    endDate: document.getElementById('announcementEnd').value
  }
  
  try {
    const url = id ? `${API_URL}/announcements/${id}` : `${API_URL}/announcements`
    const method = id ? 'PUT' : 'POST'
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(announcementData)
    })
    
    if (response.ok) {
      closeAnnouncementModal()
      loadAnnouncements()
    } else {
      const data = await response.json()
      alert('Erreur: ' + data.error)
    }
  } catch (error) {
    alert('Erreur de connexion')
  }
})

async function toggleAnnouncement(id) {
  try {
    const response = await fetch(`${API_URL}/announcements/${id}/toggle`, {
      method: 'PATCH'
    })
    
    if (response.ok) {
      loadAnnouncements()
    }
  } catch (error) {
    console.error('Erreur:', error)
  }
}

async function deleteAnnouncement(id) {
  if (!confirm('Supprimer cette annonce ?')) return
  
  try {
    const response = await fetch(`${API_URL}/announcements/${id}`, {
      method: 'DELETE'
    })
    
    if (response.ok) {
      loadAnnouncements()
    }
  } catch (error) {
    console.error('Erreur:', error)
  }
}