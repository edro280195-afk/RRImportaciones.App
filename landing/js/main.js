/* ═══════════════════════════════════════════════
   R&R Landing — Cinematic JS
   Lenis + GSAP + ScrollTrigger
   ═══════════════════════════════════════════════ */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

// ── Lenis Smooth Scroll ──
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Connect Lenis to GSAP ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

// ── Init ──
window.addEventListener('DOMContentLoaded', () => {
  initPreloader();
});

function initAll() {
  initScrollProgress();
  initCursor();
  initMobileMenu();
  initSmoothAnchors();
  initHeroAnimations();
  initImageReveal();
  initCounters();
  initProcessPanels();
  initFadeUpElements();
  initPortalAccordion();
  initTestimonials();
  initMagneticButtons();
  initGalleryCarousel();
  initLightbox();
}

/* ══════════════════════════════════════════════
   PRELOADER
   ══════════════════════════════════════════════ */
function initPreloader() {
  const preloader = document.getElementById('preloader');
  const logo = document.getElementById('preloader-logo');
  const line = document.getElementById('preloader-line');

  const tl = gsap.timeline({
    onComplete: () => {
      initAll();
    }
  });

  // Logo fade in
  tl.to(logo, {
    opacity: 1,
    duration: 0.6,
    ease: 'power2.out',
  });

  // Line expands
  tl.to(line, {
    scaleX: 1,
    duration: 0.8,
    ease: 'power3.inOut',
  }, '-=0.2');

  // Hold
  tl.to({}, { duration: 0.4 });

  // Everything exits
  tl.to([logo, line], {
    opacity: 0,
    y: -20,
    duration: 0.4,
    ease: 'power2.in',
  });

  // Preloader slides up
  tl.to(preloader, {
    yPercent: -100,
    duration: 0.8,
    ease: 'power3.inOut',
    onComplete: () => {
      preloader.style.display = 'none';
    }
  }, '-=0.2');
}

/* ══════════════════════════════════════════════
   SCROLL PROGRESS BAR
   ══════════════════════════════════════════════ */
function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;

  gsap.to(bar, {
    width: '100%',
    ease: 'none',
    scrollTrigger: {
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.3,
    }
  });
}

/* ══════════════════════════════════════════════
   CUSTOM CURSOR
   ══════════════════════════════════════════════ */
function initCursor() {
  if (window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window) return;

  const cursor = document.getElementById('cursor');
  if (!cursor) return;

  let mx = 0, my = 0, cx = 0, cy = 0;
  let hasMoved = false;

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    if (!hasMoved) {
      hasMoved = true;
      cursor.style.opacity = '1';
    }
  });

  document.addEventListener('mouseleave', () => {
    cursor.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    cursor.style.opacity = '1';
  });

  (function loop() {
    cx += (mx - cx) * 0.15;
    cy += (my - cy) * 0.15;
    cursor.style.left = `${cx}px`;
    cursor.style.top = `${cy}px`;
    requestAnimationFrame(loop);
  })();

  const hoverEls = document.querySelectorAll('a, button, [data-magnetic], .gallery-item, .accordion-header');
  hoverEls.forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
  });
}

/* ══════════════════════════════════════════════
   MOBILE MENU
   ══════════════════════════════════════════════ */
function initMobileMenu() {
  const hamburger = document.getElementById('nav-hamburger');
  const menu = document.getElementById('mobile-menu');
  if (!hamburger || !menu) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    menu.classList.toggle('open');
  });

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      menu.classList.remove('open');
    });
  });
}

/* ══════════════════════════════════════════════
   SMOOTH ANCHOR LINKS
   ══════════════════════════════════════════════ */
function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        lenis.scrollTo(target, { offset: -80, duration: 1.5 });
      }
    });
  });
}

/* ══════════════════════════════════════════════
   HERO ANIMATIONS
   ══════════════════════════════════════════════ */
function initHeroAnimations() {
  const tl = gsap.timeline({ delay: 0.2 });

  // Text reveals (slide up from mask)
  document.querySelectorAll('[data-reveal]').forEach((el, i) => {
    tl.to(el, {
      y: 0,
      duration: 1,
      ease: 'power3.out',
    }, i * 0.12);
  });

  // Line reveal
  const heroLine = document.querySelector('[data-reveal-line]');
  if (heroLine) {
    tl.fromTo(heroLine, { scaleX: 0 }, {
      scaleX: 1,
      duration: 0.8,
      ease: 'power3.out',
    }, 0.5);
  }

  // Fade up elements
  document.querySelectorAll('.hero [data-fade-up]').forEach((el, i) => {
    const delay = parseFloat(el.dataset.delay || 0);
    tl.fromTo(el,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' },
      0.7 + delay
    );
  });

  // Hero parallax on scroll
  const heroBgImg = document.querySelector('.hero-bg img');
  if (heroBgImg) {
    gsap.to(heroBgImg, {
      y: 150,
      scale: 1.05,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      }
    });
  }
}

/* ══════════════════════════════════════════════
   IMAGE REVEAL (Zoom out on scroll)
   ══════════════════════════════════════════════ */
function initImageReveal() {
  const img = document.getElementById('reveal-img');
  if (!img) return;

  gsap.to(img, {
    scale: 1,
    ease: 'none',
    scrollTrigger: {
      trigger: '.image-reveal',
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    }
  });
}

/* ══════════════════════════════════════════════
   COUNTERS
   ══════════════════════════════════════════════ */
function initCounters() {
  document.querySelectorAll('.counter').forEach(counter => {
    const target = parseInt(counter.dataset.target);
    if (isNaN(target)) return;

    const obj = { val: 0 };

    ScrollTrigger.create({
      trigger: counter.closest('.stat-row'),
      start: 'top 80%',
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          val: target,
          duration: 2.5,
          ease: 'power2.out',
          snap: { val: 1 },
          onUpdate: () => {
            counter.textContent = obj.val.toLocaleString('es-MX');
          }
        });
      }
    });
  });
}

/* ══════════════════════════════════════════════
   PROCESS — Horizontal scroll panels (pinned)
   ══════════════════════════════════════════════ */
function initProcessPanels() {
  const section = document.querySelector('.process-section');
  const panels = document.getElementById('process-panels');
  if (!section || !panels) return;

  const allPanels = panels.querySelectorAll('.process-panel');
  const totalPanels = allPanels.length;

  const getDistance = () => panels.scrollWidth - window.innerWidth;

  // Horizontal scroll
  const scrollTween = gsap.to(panels, {
    x: () => -getDistance(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => `+=${getDistance() + window.innerHeight}`,
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
    }
  });

  // Panel progress fills + activation
  allPanels.forEach((panel, i) => {
    const fill = panel.querySelector('.process-progress-fill');
    const fraction = (i + 1) / totalPanels;

    // Update all progress fills based on overall scroll
    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${getDistance() + window.innerHeight}`,
      onUpdate: (self) => {
        // Fill each panel's bar
        if (fill) {
          fill.style.width = `${Math.min(100, (self.progress / fraction) * 100)}%`;
        }

        // Activate panel
        const stepStart = i / totalPanels;
        const stepEnd = (i + 1) / totalPanels;
        if (self.progress >= stepStart && self.progress < stepEnd) {
          allPanels.forEach(p => p.classList.remove('active'));
          panel.classList.add('active');
        }
      }
    });
  });
}

/* ══════════════════════════════════════════════
   FADE-UP ELEMENTS (Generic scroll-triggered)
   ══════════════════════════════════════════════ */
function initFadeUpElements() {
  const elements = document.querySelectorAll('[data-fade-up]');

  elements.forEach(el => {
    // Skip hero elements (handled separately)
    if (el.closest('.hero')) return;

    gsap.fromTo(el,
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true,
        }
      }
    );
  });

  // Stat rows
  document.querySelectorAll('.stat-row').forEach((row, i) => {
    gsap.fromTo(row,
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'power3.out',
        delay: i * 0.1,
        scrollTrigger: {
          trigger: row,
          start: 'top 85%',
          once: true,
        }
      }
    );
  });
}

/* ══════════════════════════════════════════════
   PORTAL ACCORDION
   ══════════════════════════════════════════════ */
function initPortalAccordion() {
  const items = document.querySelectorAll('.accordion-item');
  if (items.length === 0) return;

  items.forEach(item => {
    const header = item.querySelector('.accordion-header');
    header.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      // Close all
      items.forEach(i => {
        i.classList.remove('active');
        const body = i.querySelector('.accordion-body');
        if (body) body.style.height = '0px';
      });

      // Open if wasn't active
      if (!isActive) {
        item.classList.add('active');
        const body = item.querySelector('.accordion-body');
        const content = body.querySelector('.accordion-body-content');
        if (body && content) {
          body.style.height = content.offsetHeight + 'px';
        }
      }
    });
  });

  // Set initial height for active item
  const initialActive = document.querySelector('.accordion-item.active');
  if (initialActive) {
    const body = initialActive.querySelector('.accordion-body');
    const content = body.querySelector('.accordion-body-content');
    if (body && content) {
      body.style.height = content.offsetHeight + 'px';
    }
  }

  // Update heights on resize
  window.addEventListener('resize', () => {
    const activeItem = document.querySelector('.accordion-item.active');
    if (activeItem) {
      const body = activeItem.querySelector('.accordion-body');
      const content = body.querySelector('.accordion-body-content');
      if (body && content) {
        body.style.height = content.offsetHeight + 'px';
      }
    }
  });
}

/* ══════════════════════════════════════════════
   TESTIMONIALS — Auto-rotating crossfade
   ══════════════════════════════════════════════ */
function initTestimonials() {
  const slides = document.querySelectorAll('.testimonial-slide');
  const dots = document.querySelectorAll('.testimonials-dot');
  if (slides.length === 0) return;

  let current = 0;
  let interval;

  function goTo(index) {
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    slides[index].classList.add('active');
    dots[index].classList.add('active');
    current = index;
  }

  function next() {
    goTo((current + 1) % slides.length);
  }

  function startAutoplay() {
    interval = setInterval(next, 5000);
  }

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      clearInterval(interval);
      goTo(parseInt(dot.dataset.dot));
      startAutoplay();
    });
  });

  startAutoplay();
}

/* ══════════════════════════════════════════════
   MAGNETIC BUTTONS
   ══════════════════════════════════════════════ */
function initMagneticButtons() {
  if (window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window) return;

  document.querySelectorAll('[data-magnetic]').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      gsap.to(btn, {
        x: x * 0.3,
        y: y * 0.3,
        duration: 0.4,
        ease: 'power2.out',
      });
    });

    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: 'elastic.out(1, 0.5)',
      });
    });
  });
}

/* ══════════════════════════════════════════════
   GALLERY CAROUSEL INFINITE CLONING
   ══════════════════════════════════════════════ */
function initGalleryCarousel() {
  const track = document.querySelector('.gallery-track');
  if (!track) return;
  const items = Array.from(track.children);
  items.forEach(item => {
    const clone = item.cloneNode(true);
    track.appendChild(clone);
  });
}

/* ══════════════════════════════════════════════
   GALLERY LIGHTBOX
   ══════════════════════════════════════════════ */
function initLightbox() {
  const items = document.querySelectorAll('.gallery-item');
  const lightbox = document.getElementById('gallery-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const closeBtn = document.getElementById('lightbox-close');

  if (!lightbox || !lightboxImg || items.length === 0) return;

  items.forEach(item => {
    item.addEventListener('click', () => {
      const src = item.dataset.src;
      if (src) {
        lightboxImg.src = src;
        lightbox.classList.add('active');
        // Stop scroll using lenis
        if (typeof lenis !== 'undefined') lenis.stop();
      }
    });
  });

  function closeLightbox() {
    lightbox.classList.remove('active');
    setTimeout(() => { lightboxImg.src = ''; }, 400);
    if (typeof lenis !== 'undefined') lenis.start();
  }

  closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  
  // ESC key support
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
      closeLightbox();
    }
  });
}
