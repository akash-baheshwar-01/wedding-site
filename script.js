(() => {
  "use strict";
  const config = window.WEDDING_CONFIG;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function getValue(path) {
    return path.split(".").reduce((value, key) => value?.[key], config);
  }

  function bindContent() {
    $$('[data-bind]').forEach(element => {
      const value = getValue(element.dataset.bind);
      if (value !== undefined) element.textContent = value;
    });
    $$('[data-src]').forEach(element => element.src = getValue(element.dataset.src));
  }

  function makePetals() {
    const container = $('.petals');
    if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (let i = 0; i < 14; i++) {
      const petal = document.createElement('span');
      petal.className = 'petal';
      petal.textContent = Math.random() > .5 ? '❧' : '✦';
      petal.style.left = `${Math.random() * 100}%`;
      petal.style.animationDuration = `${7 + Math.random() * 7}s`;
      petal.style.animationDelay = `${Math.random() * 8}s`;
      petal.style.fontSize = `${10 + Math.random() * 12}px`;
      container.appendChild(petal);
    }
  }

  function createEvents() {
    const list = $('#eventsList');
    list.innerHTML = config.events.map(event => `
      <article class="event-card reveal">
        <div class="event-icon" aria-hidden="true">${event.icon}</div>
        <div><h3>${event.name}</h3><p>${event.date}</p><p>${event.time}</p><p>${event.venue}</p></div>
      </article>`).join('');
  }

  function createGallery() {
    $('#galleryGrid').innerHTML = config.gallery.map((image, index) => `
      <button class="gallery-item reveal" type="button" data-index="${index}" aria-label="तस्वीर देखें: ${image.caption}">
        <img src="${image.src}" alt="${image.caption}" loading="lazy">
      </button>`).join('');
  }

  function updateCountdown() {
    const target = new Date(config.weddingDate).getTime();
    const distance = target - Date.now();
    if (!Number.isFinite(target) || distance <= 0) {
      ['days', 'hours', 'minutes', 'seconds'].forEach(id => $(`#${id}`).textContent = '00');
      $('#countdownMessage').textContent = 'शुभ विवाह की हार्दिक मंगलकामनाएँ!';
      return;
    }
    const day = 86400000;
    const hour = 3600000;
    const minute = 60000;
    $('#days').textContent = String(Math.floor(distance / day)).padStart(2, '0');
    $('#hours').textContent = String(Math.floor(distance % day / hour)).padStart(2, '0');
    $('#minutes').textContent = String(Math.floor(distance % hour / minute)).padStart(2, '0');
    $('#seconds').textContent = String(Math.floor(distance % minute / 1000)).padStart(2, '0');
  }

  let weddingAudio;
  let musicPlaying = false;

  function startWeddingMusic() {
    weddingAudio ||= new Audio(config.music);
    weddingAudio.loop = true;
    weddingAudio.volume = 0.65;
    weddingAudio.play().catch(() => {});
    musicPlaying = true;
  }

  function enableWeddingMusic() {
    startWeddingMusic();
    if (!weddingAudio) return;
    weddingAudio.muted = false;
  }

  function playOpeningChime() {
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      [523.25, 659.25, 783.99].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gain.gain.setValueAtTime(0, context.currentTime + index * .09);
        gain.gain.linearRampToValueAtTime(.07, context.currentTime + index * .09 + .03);
        gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + index * .09 + 1.3);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(context.currentTime + index * .09);
        oscillator.stop(context.currentTime + index * .09 + 1.4);
      });
    } catch (_) {}
  }

  function setupOpening() {
    const video = $('#openingVideo');
    video?.play().catch(() => {});
    startWeddingMusic();
    weddingAudio.muted = true;
    document.addEventListener('pointerdown', enableWeddingMusic, { once: true });
    document.addEventListener('keydown', enableWeddingMusic, { once: true });
    $('#openCard').addEventListener('click', () => {
      enableWeddingMusic();
      playOpeningChime();
      $('#opening').classList.add('opened');
      setTimeout(() => {
        $('#opening').style.display = 'none';
        $('#mainInvitation').setAttribute('aria-hidden', 'false');
        $('#mainInvitation').classList.add('visible');
        $('#bottomNav').classList.add('visible');
        video?.pause();
      }, 750);
    });
  }

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setupNavigation() {
    $$('.nav-item').forEach(button => button.addEventListener('click', () => scrollToSection(button.dataset.target)));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.target === entry.target.dataset.nav));
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
    $$('[data-nav]').forEach(section => observer.observe(section));
  }

  function setupReveal() {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: .12 });
    $$('.reveal').forEach(element => observer.observe(element));
  }

  let lightboxIndex = 0;
  function showLightbox(index) {
    lightboxIndex = (index + config.gallery.length) % config.gallery.length;
    const image = config.gallery[lightboxIndex];
    $('#lightboxImage').src = image.src;
    $('#lightboxCaption').textContent = image.caption;
    $('#lightbox').classList.add('open');
    $('#lightbox').setAttribute('aria-hidden', 'false');
  }

  function closeLightbox() {
    $('#lightbox').classList.remove('open');
    $('#lightbox').setAttribute('aria-hidden', 'true');
  }

  function setupGallery() {
    if (!$('#galleryGrid')) return;
    $('#galleryGrid').addEventListener('click', event => {
      const item = event.target.closest('.gallery-item');
      if (item) showLightbox(Number(item.dataset.index));
    });
    $('#lightboxClose').addEventListener('click', closeLightbox);
    $('#lightboxPrev').addEventListener('click', () => showLightbox(lightboxIndex - 1));
    $('#lightboxNext').addEventListener('click', () => showLightbox(lightboxIndex + 1));
    $('#lightbox').addEventListener('click', event => { if (event.target === $('#lightbox')) closeLightbox(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeLightbox();
      if (!$('#lightbox').classList.contains('open')) return;
      if (event.key === 'ArrowLeft') showLightbox(lightboxIndex - 1);
      if (event.key === 'ArrowRight') showLightbox(lightboxIndex + 1);
    });
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function setupActions() {
    const invitationUrl = window.location.href;
    const message = `॥ शुभ विवाह ॥\n\n${config.groom.name} और ${config.bride.name} के शुभ विवाह पर आप सपरिवार सादर आमंत्रित हैं।\nदिनांक: ${config.weddingDateLong}\nस्थान: ${config.venue.name}, ${config.venue.address}, ${config.venue.cityState}\n\nशुभ शुभकामनाएँ\n${invitationUrl}`;
    $('#shareButton').addEventListener('click', () => window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener'));
    $('#copyButton').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(invitationUrl); showToast('आमंत्रण का लिंक कॉपी हो गया'); }
      catch (_) { showToast('लिंक कॉपी नहीं हो सका'); }
    });
    $('#rsvpButton').addEventListener('click', () => {
      const phone = '';
      const text = encodeURIComponent(`नमस्ते, मैं ${config.groom.name} एवं ${config.bride.name} के विवाह में उपस्थिति की पुष्टि करता/करती हूँ।`);
      window.location.href = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    });
    $('#calendarButton').addEventListener('click', () => {
      const start = new Date(config.weddingDate);
      const end = new Date(start.getTime() + 4 * 3600000);
      const format = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const url = new URL('https://calendar.google.com/calendar/render');
      url.search = new URLSearchParams({ action: 'TEMPLATE', text: `${config.groom.name} एवं ${config.bride.name} का शुभ विवाह`, dates: `${format(start)}/${format(end)}`, details: message, location: `${config.venue.name}, ${config.venue.address}` }).toString();
      window.open(url.toString(), '_blank', 'noopener');
    });
    const mapQuery = encodeURIComponent(`${config.venue.name}, ${config.venue.address}, ${config.venue.cityState}`);
    $('#mapButton').href = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
  }

  function init() {
    bindContent();
    createEvents();
    if ($('#galleryGrid')) createGallery();
    setupOpening();
    setupNavigation();
    setupGallery();
    setupActions();
    setupReveal();
    makePetals();
    updateCountdown();
    setInterval(updateCountdown, 1000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
