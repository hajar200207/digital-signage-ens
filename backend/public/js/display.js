// Configuration
const API_URL = 'http://localhost:4000/api'
const NEWS_API_KEY = 'ab03b5e53ed6729813441746fccbbae7'
const NEWS_API_URL = 'https://newsapi.org/v2/top-headlines?country=ma&apiKey=' + NEWS_API_KEY

const ANNOUNCEMENT_REFRESH = 60000 // 1 minute
const SLIDE_CHECK_INTERVAL = 30000 // 30 secondes
const WEATHER_REFRESH = 600000 // 10 minutes
const NEWS_REFRESH = 900000 // 15 minutes

let slides = []
let announcements = []
let newsArticles = []
let currentSlideIndex = 0
let slideTimer = null
let slideshowTimer = null
let currentSlideshowIndex = 0

// ======================
// INITIALISATION
// ======================

document.addEventListener('DOMContentLoaded', async () => {
  await loadSlides()
  await loadAnnouncements()
  await updateWeather()
  await loadNews()
  
  startSlideShow()
  updateClock()
  setInterval(updateClock, 1000)
  
  // Rafraîchir les données périodiquement
  setInterval(loadSlides, SLIDE_CHECK_INTERVAL)
  setInterval(loadAnnouncements, ANNOUNCEMENT_REFRESH)
  setInterval(updateWeather, WEATHER_REFRESH)
  setInterval(loadNews, NEWS_REFRESH)
  
  // Masquer le loading
  setTimeout(() => {
    document.getElementById('loading').style.display = 'none'
  }, 1000)
})

// ======================
// CHARGEMENT DES DONNÉES
// ======================

async function loadSlides() {
  try {
    const response = await fetch(`${API_URL}/slides`)
    slides = await response.json()
    console.log('Slides chargés:', slides.length)
    
    if (slides.length === 0) {
      showNoContentMessage()
    }
  } catch (error) {
    console.error('Erreur chargement slides:', error)
    showErrorMessage('Erreur de connexion au serveur')
  }
}

async function loadAnnouncements() {
  try {
    const response = await fetch(`${API_URL}/announcements`)
    const allAnnouncements = await response.json()
    
    // Filtrer les annonces actives et dans leur période
    const now = new Date()
    announcements = allAnnouncements.filter(a => {
      return a.isActive && 
             new Date(a.startDate) <= now && 
             new Date(a.endDate) >= now
    })
    
    displayAnnouncements()
  } catch (error) {
    console.error('Erreur chargement annonces:', error)
  }
}

async function loadNews() {
  try {
    const response = await fetch(NEWS_API_URL)
    const data = await response.json()
    
    if (data.status === 'ok' && data.articles) {
      newsArticles = data.articles.slice(0, 10) // Garder les 10 premières
      console.log('Actualités chargées:', newsArticles.length)
    }
  } catch (error) {
    console.error('Erreur chargement actualités:', error)
    newsArticles = []
  }
}

// ======================
// SLIDESHOW
// ======================

function startSlideShow() {
  if (slides.length === 0) return
  
  renderCurrentSlide()
  
  // Timer pour passer au slide suivant
  const duration = slides[currentSlideIndex]?.duration || 10
  slideTimer = setTimeout(() => {
    nextSlide()
  }, duration * 1000)
}

function nextSlide() {
  currentSlideIndex = (currentSlideIndex + 1) % slides.length
  clearTimeout(slideTimer)
  clearTimeout(slideshowTimer)
  startSlideShow()
}

function renderCurrentSlide() {
  if (slides.length === 0) return
  
  const slide = slides[currentSlideIndex]
  const container = document.getElementById('mainDisplay')
  
  // Nettoyer le contenu précédent
  container.innerHTML = ''
  
  // Créer le widget selon le type
  const widget = document.createElement('div')
  widget.className = 'widget active'
  
  switch (slide.type) {
    case 'image':
      renderImage(widget, slide)
      break
    case 'slideshow':
      renderSlideshow(widget, slide)
      break
    case 'video':
      renderVideo(widget, slide)
      break
    case 'pptx':
      renderPowerPoint(widget, slide)
      break
    case 'youtube':
      renderYouTube(widget, slide)
      break
    case 'weather':
      renderWeather(widget, slide)
      break
    case 'news':
      renderNews(widget, slide)
      break
    case 'iframe':
      renderIframe(widget, slide)
      break
    case 'list':
      renderList(widget, slide)
      break
    case 'congratulations':
      renderCongratulations(widget, slide)
      break
    default:
      renderError(widget, 'Type de widget inconnu')
  }
  
  container.appendChild(widget)
}

// ======================
// RENDERERS
// ======================

function renderImage(widget, slide) {
  widget.className = 'widget widget-image active'
  const img = document.createElement('img')
  img.src = slide.content
  img.alt = slide.title
  img.onerror = () => {
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23999"%3EImage non disponible%3C/text%3E%3C/svg%3E'
  }
  widget.appendChild(img)
}

function renderSlideshow(widget, slide) {
  widget.className = 'widget widget-slideshow active'
  
  // Parse le contenu (array d'URLs)
  let images = []
  try {
    images = typeof slide.content === 'string' ? JSON.parse(slide.content) : slide.content
  } catch (e) {
    console.error('Erreur parse slideshow:', e)
    return
  }
  
  if (!Array.isArray(images) || images.length === 0) {
    renderError(widget, 'Aucune image dans le slideshow')
    return
  }
  
  // Créer toutes les images
  images.forEach((imgUrl, index) => {
    const img = document.createElement('img')
    img.src = imgUrl
    img.className = 'slideshow-image'
    if (index === 0) img.classList.add('active')
    widget.appendChild(img)
  })
  
  // Animer le slideshow
  let currentIndex = 0
  const slideshowInterval = 3000 // 3 secondes par image
  
  slideshowTimer = setInterval(() => {
    const allImages = widget.querySelectorAll('.slideshow-image')
    allImages[currentIndex].classList.remove('active')
    currentIndex = (currentIndex + 1) % images.length
    allImages[currentIndex].classList.add('active')
  }, slideshowInterval)
}

function renderVideo(widget, slide) {
  widget.className = 'widget widget-video active'
  
  const video = document.createElement('video')
  video.src = slide.content
  video.autoplay = true
  video.muted = false // SON ACTIVÉ
  video.loop = slide.settings?.loop !== false
  video.controls = true // Ajouter les contrôles pour ajuster le volume
  video.style.width = '85%'
  video.style.height = '80%'
  video.style.objectFit = 'contain'
  video.style.borderRadius = '15px'
  
  widget.appendChild(video)
}

function renderPowerPoint(widget, slide) {
  widget.className = 'widget widget-image active'
  
  const container = document.createElement('div')
  container.style.textAlign = 'center'
  container.style.padding = '50px'
  
  const icon = document.createElement('div')
  icon.textContent = '📊'
  icon.style.fontSize = '150px'
  icon.style.marginBottom = '30px'
  
  const title = document.createElement('h2')
  title.textContent = slide.title
  title.style.fontSize = '50px'
  title.style.marginBottom = '20px'
  
  const link = document.createElement('a')
  link.href = slide.content
  link.textContent = 'Télécharger la présentation'
  link.style.fontSize = '30px'
  link.style.color = '#667eea'
  link.target = '_blank'
  
  container.appendChild(icon)
  container.appendChild(title)
  container.appendChild(link)
  widget.appendChild(container)
}

function renderYouTube(widget, slide) {
  widget.className = 'widget widget-video active'
  
  const videoId = slide.content
  const iframe = document.createElement('iframe')
  // Retirer mute=1 pour avoir le son sur YouTube
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}`
  iframe.style.width = '85%'
  iframe.style.height = '80%'
  iframe.style.border = 'none'
  iframe.style.borderRadius = '15px'
  iframe.allow = 'autoplay; encrypted-media'
  
  widget.appendChild(iframe)
}

function renderWeather(widget, slide) {
  widget.className = 'widget widget-weather active'
  
  const container = document.createElement('div')
  container.style.textAlign = 'center'
  container.style.padding = '50px'
  
  const icon = document.createElement('div')
  icon.className = 'weather-icon'
  icon.textContent = '☀️'
  
  const temp = document.createElement('div')
  temp.className = 'weather-temp'
  temp.textContent = '25°C'
  
  const location = document.createElement('div')
  location.className = 'weather-location'
  
  try {
    const weatherData = typeof slide.content === 'string' ? JSON.parse(slide.content) : slide.content
    location.textContent = weatherData.city || 'Rabat'
  } catch (e) {
    location.textContent = 'Rabat'
  }
  
  container.appendChild(icon)
  container.appendChild(temp)
  container.appendChild(location)
  widget.appendChild(container)
}

function renderNews(widget, slide) {
  widget.className = 'widget widget-news active'
  
  const container = document.createElement('div')
  container.style.width = '100%'
  container.style.height = '100%'
  container.style.padding = '40px'
  container.style.overflow = 'auto'
  
  // Header
  const header = document.createElement('div')
  header.className = 'news-header'
  
  const title = document.createElement('div')
  title.className = 'news-title'
  title.textContent = '📰 ' + (slide.title || 'Actualités du Maroc')
  
  const subtitle = document.createElement('div')
  subtitle.className = 'news-subtitle'
  subtitle.textContent = 'Dernières nouvelles'
  
  header.appendChild(title)
  header.appendChild(subtitle)
  
  // Grid d'articles
  const grid = document.createElement('div')
  grid.className = 'news-grid'
  
  if (newsArticles.length === 0) {
    const noNews = document.createElement('div')
    noNews.style.textAlign = 'center'
    noNews.style.padding = '50px'
    noNews.style.fontSize = '30px'
    noNews.textContent = '📡 Chargement des actualités...'
    grid.appendChild(noNews)
  } else {
    newsArticles.slice(0, 6).forEach(article => {
      const item = document.createElement('div')
      item.className = 'news-item'
      
      const itemTitle = document.createElement('div')
      itemTitle.className = 'news-item-title'
      itemTitle.textContent = article.title || 'Sans titre'
      
      const itemDesc = document.createElement('div')
      itemDesc.className = 'news-item-description'
      itemDesc.textContent = (article.description || 'Aucune description disponible').substring(0, 150) + '...'
      
      const itemMeta = document.createElement('div')
      itemMeta.className = 'news-item-meta'
      
      const source = document.createElement('span')
      source.className = 'news-source'
      source.textContent = article.source?.name || 'Source inconnue'
      
      const time = document.createElement('span')
      time.className = 'news-time'
      time.textContent = formatNewsTime(article.publishedAt)
      
      itemMeta.appendChild(source)
      itemMeta.appendChild(time)
      
      item.appendChild(itemTitle)
      item.appendChild(itemDesc)
      item.appendChild(itemMeta)
      
      grid.appendChild(item)
    })
  }
  
  container.appendChild(header)
  container.appendChild(grid)
  widget.appendChild(container)
}

function formatNewsTime(timestamp) {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 60) return `Il y a ${diffMins} min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`
  
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function renderIframe(widget, slide) {
  widget.className = 'widget widget-video active'
  
  const iframe = document.createElement('iframe')
  iframe.src = slide.content
  iframe.style.width = '85%'
  iframe.style.height = '80%'
  iframe.style.border = 'none'
  iframe.style.borderRadius = '15px'
  
  widget.appendChild(iframe)
}

function renderList(widget, slide) {
  widget.className = 'widget widget-list active'
  
  const container = document.createElement('div')
  container.style.width = '85%'
  container.style.maxWidth = '1400px'
  
  const title = document.createElement('div')
  title.className = 'list-title'
  title.textContent = slide.title
  
  const itemsContainer = document.createElement('div')
  itemsContainer.className = 'list-items'
  
  try {
    const items = typeof slide.content === 'string' ? JSON.parse(slide.content) : slide.content
    
    if (Array.isArray(items)) {
      items.forEach(item => {
        const itemDiv = document.createElement('div')
        itemDiv.className = 'list-item'
        itemDiv.innerHTML = `
          <strong>${item.nom || item.name || 'Item'}</strong><br>
          ${item.info || item.description || ''}
        `
        itemsContainer.appendChild(itemDiv)
      })
    }
  } catch (e) {
    console.error('Erreur parse list:', e)
  }
  
  container.appendChild(title)
  container.appendChild(itemsContainer)
  widget.appendChild(container)
}

function renderCongratulations(widget, slide) {
  widget.className = 'widget widget-congratulations active'
  
  const icon = document.createElement('div')
  icon.className = 'congratulations-icon'
  icon.textContent = '🎉'
  
  const title = document.createElement('div')
  title.className = 'congratulations-title'
  
  const message = document.createElement('div')
  message.className = 'congratulations-message'
  
  try {
    const content = typeof slide.content === 'string' ? JSON.parse(slide.content) : slide.content
    title.textContent = content.title || slide.title
    message.textContent = content.message || 'Félicitations!'
  } catch (e) {
    title.textContent = slide.title
    message.textContent = 'Félicitations!'
  }
  
  widget.appendChild(icon)
  widget.appendChild(title)
  widget.appendChild(message)
}

function renderError(widget, message) {
  widget.innerHTML = `
    <div style="text-align: center; padding: 50px; color: white;">
      <div style="font-size: 80px; margin-bottom: 20px;">⚠️</div>
      <div style="font-size: 30px;">${message}</div>
    </div>
  `
}

// ======================
// ANNONCES
// ======================

function displayAnnouncements() {
  const ticker = document.getElementById('announcementsTicker')
  const content = document.getElementById('tickerContent')
  
  if (announcements.length === 0) {
    ticker.style.display = 'none'
    return
  }
  
  ticker.style.display = 'block'
  
  // Créer le contenu du ticker
  content.innerHTML = announcements.map(a => {
    const className = a.type === 'urgent' ? 'ticker-item urgent' : 'ticker-item'
    const icon = {
      'urgent': '🚨',
      'info': 'ℹ️',
      'event': '📅',
      'congratulations': '🎉'
    }[a.type] || 'ℹ️'
    
    return `<span class="${className}">${icon} ${a.title}: ${a.content}</span>`
  }).join('')
}

// ======================
// UTILITAIRES
// ======================

function updateClock() {
  const now = new Date()
  
  // Date
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  document.getElementById('currentDate').textContent = now.toLocaleDateString('fr-FR', dateOptions)
  
  // Heure
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' }
  document.getElementById('currentTime').textContent = now.toLocaleTimeString('fr-FR', timeOptions)
}

// ======================
// MÉTÉO DANS LA NAVBAR
// ======================

async function updateWeather() {
  try {
    const response = await fetch('https://wttr.in/Rabat?format=j1')
    const data = await response.json()
    
    if (data && data.current_condition && data.current_condition[0]) {
      const current = data.current_condition[0]
      const temp = current.temp_C
      const weatherCode = current.weatherCode
      
      document.getElementById('weatherTemp').textContent = `${temp}°C`
      document.getElementById('weatherIcon').textContent = getWeatherIcon(weatherCode)
      
      console.log('Météo mise à jour: ' + temp + '°C')
    }
  } catch (error) {
    console.error('Erreur chargement météo:', error)
    document.getElementById('weatherTemp').textContent = '--°C'
    document.getElementById('weatherIcon').textContent = '☀️'
  }
}

function getWeatherIcon(code) {
  const weatherIcons = {
    '113': '☀️', '116': '⛅', '119': '☁️', '122': '☁️',
    '143': '🌫️', '176': '🌦️', '179': '🌨️', '182': '🌨️',
    '185': '🌨️', '200': '⛈️', '227': '🌨️', '230': '❄️',
    '248': '🌫️', '260': '🌫️', '263': '🌦️', '266': '🌧️',
    '281': '🌧️', '284': '🌧️', '293': '🌦️', '296': '🌧️',
    '299': '🌧️', '302': '🌧️', '305': '🌧️', '308': '🌧️',
    '311': '🌧️', '314': '🌧️', '317': '🌨️', '320': '🌨️',
    '323': '🌨️', '326': '❄️', '329': '❄️', '332': '❄️',
    '335': '❄️', '338': '❄️', '350': '🌨️', '353': '🌦️',
    '356': '🌧️', '359': '🌧️', '362': '🌨️', '365': '🌨️',
    '368': '🌨️', '371': '❄️', '374': '🌨️', '377': '🌨️',
    '386': '⛈️', '389': '⛈️', '392': '⛈️', '395': '⛈️'
  }
  
  return weatherIcons[code] || '☀️'
}

function showNoContentMessage() {
  const container = document.getElementById('mainDisplay')
  container.innerHTML = `
    <div class="widget active" style="text-align: center; padding: 50px;">
      <div style="font-size: 150px; margin-bottom: 30px;">📺</div>
      <div style="font-size: 50px; margin-bottom: 20px;">Aucun contenu disponible</div>
      <div style="font-size: 30px; opacity: 0.7;">Ajoutez des widgets depuis le panneau d'administration</div>
    </div>
  `
}

function showErrorMessage(message) {
  const container = document.getElementById('mainDisplay')
  container.innerHTML = `
    <div class="widget active" style="text-align: center; padding: 50px;">
      <div style="font-size: 150px; margin-bottom: 30px;">⚠️</div>
      <div style="font-size: 50px; margin-bottom: 20px;">Erreur</div>
      <div style="font-size: 30px; opacity: 0.7;">${message}</div>
    </div>
  `
  
  document.getElementById('connectionStatus').textContent = '🔴'
}