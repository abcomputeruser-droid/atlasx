const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

function initReveal() {
  const sections = qsa(".container");
  sections.forEach((section) => section.classList.add("reveal"));

  const staggerGroups = qsa(
    ".scroll-steps, .gallery-grid, .specs-grid, .overview-stats, .hero-chips, .cards, .product-grid"
  );
  staggerGroups.forEach((group) => group.classList.add("reveal", "stagger"));

  if (!("IntersectionObserver" in window)) {
    sections.forEach((section) => section.classList.add("in-view"));
    staggerGroups.forEach((group) => group.classList.add("in-view"));
    return;
  }

  const revealTargets = Array.from(new Set([...sections, ...staggerGroups]));
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  revealTargets.forEach((section) => observer.observe(section));
}

function initMotionBackground() {
  const stage = qs(".motion-bg");
  if (!stage) return;

  const orbs = qsa(".orb", stage);
  if (!orbs.length) return;

  const motions = [
    { el: orbs[0], x: 140, y: 200, r: 12 },
    { el: orbs[1], x: -180, y: 140, r: -10 },
    { el: orbs[2], x: 120, y: -160, r: 8 },
    { el: orbs[3], x: -120, y: -200, r: 6 },
  ].filter((item) => item.el);

  const applyMotion = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    const drift = progress - 0.5;

    motions.forEach((item) => {
      const x = drift * item.x;
      const y = drift * item.y;
      const r = drift * item.r;
      item.el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${r}deg)`;
    });
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      applyMotion();
      ticking = false;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  applyMotion();
}

function initScrollStory() {
  const section = qs(".scroll-story");
  if (!section) return;

  const image = qs("#scrollImage", section);
  const bar = qs("#scrollBar", section);
  const items = qsa(".scroll-item", section);
  if (!image || !items.length) return;

  let swapTimer = null;
  const total = items.length;

  const swapImage = (nextSrc, nextAlt) => {
    if (!nextSrc || image.dataset.src === nextSrc) return;
    image.classList.add("is-swapping");
    image.dataset.src = nextSrc;
    if (swapTimer) {
      window.clearTimeout(swapTimer);
    }
    swapTimer = window.setTimeout(() => {
      image.onload = () => {
        image.classList.remove("is-swapping");
      };
      image.src = nextSrc;
      image.alt = nextAlt;
      if (image.complete) {
        image.classList.remove("is-swapping");
      }
    }, 120);
  };

  const setActive = (item, index) => {
    items.forEach((node) => node.classList.remove("is-active"));
    item.classList.add("is-active");
    const nextSrc = item.dataset.image;
    const nextAlt = item.dataset.alt || item.querySelector("h3")?.textContent || "Atlas highlight";
    const nextAccent = item.dataset.accent;
    if (nextAccent) {
      section.style.setProperty("--scroll-accent", nextAccent);
    }
    swapImage(nextSrc, nextAlt);
    if (bar) {
      bar.style.height = `${Math.round(((index + 1) / total) * 100)}%`;
    }
  };

  setActive(items[0], 0);

  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const index = items.indexOf(entry.target);
        if (index === -1) return;
        setActive(entry.target, index);
      });
    },
    { rootMargin: "-35% 0px -50% 0px", threshold: 0.2 }
  );

  items.forEach((item) => observer.observe(item));
}

function initHeroVideo() {
  const video = qs(".product-hero-video");
  if (!video) return;

  const playbackRate = Number(video.dataset.playbackRate || 0.9);
  const readyStateTarget = HTMLMediaElement.HAVE_FUTURE_DATA;

  const setPlaybackRate = () => {
    if (!Number.isFinite(playbackRate) || playbackRate <= 0) return;
    video.defaultPlaybackRate = playbackRate;
    video.playbackRate = playbackRate;
  };

  const markReady = () => {
    video.classList.add("is-ready");
  };

  const ensurePlaying = () => {
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  };

  video.muted = true;
  video.playsInline = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");

  video.addEventListener("loadedmetadata", setPlaybackRate);
  video.addEventListener("canplay", () => {
    setPlaybackRate();
    markReady();
    ensurePlaying();
  });
  video.addEventListener("playing", markReady);

  if (video.readyState >= readyStateTarget) {
    setPlaybackRate();
    markReady();
    ensurePlaying();
  } else {
    video.load();
  }
}

function initHeroSlider() {
  const section = qs('.hero-slider-section');
  if (!section) return;

  const track = qs('.hero-slides', section);
  const realSlides = qsa('.hero-slide', track);
  if (!realSlides.length) return;

  const N = realSlides.length;
  const INTERVAL = 4500;
  const DURATION = 700;

  // Bookend clones: [clone-of-last | ...realSlides | clone-of-first]
  // This lets both forward and backward wrapping feel seamless.
  const cloneLast = realSlides[N - 1].cloneNode(true);
  const cloneFirst = realSlides[0].cloneNode(true);
  track.insertBefore(cloneLast, track.firstChild);
  track.appendChild(cloneFirst);

  const allSlides = qsa('.hero-slide', track); // N + 2
  const total = allSlides.length;
  track.style.width = `${total * 100}%`;
  allSlides.forEach(s => { s.style.width = `${100 / total}%`; });

  // current is the track index; real slides live at indices 1 … N
  let current = 1;
  let isTransitioning = false;
  let autoTimer = null;

  const realIndex = (idx) => ((idx - 1) + N) % N;

  const setPos = (idx, animated) => {
    track.style.transition = animated
      ? `transform ${DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`
      : 'none';
    track.style.transform = `translateX(-${idx * (100 / total)}%)`;
  };

  // After a clone lands, snap to the real equivalent without animation.
  track.addEventListener('transitionend', (e) => {
    if (e.propertyName !== 'transform') return;
    if (current === total - 1) { current = 1; setPos(1, false); }
    else if (current === 0)    { current = N; setPos(N, false); }
    isTransitioning = false;
  });

  // Dots
  const dotsEl = qs('#sliderDots', section);
  realSlides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'hero-dot' + (i === 0 ? ' is-active' : '');
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Slide ${i + 1}`);
    dot.setAttribute('aria-selected', String(i === 0));
    dot.addEventListener('click', () => { if (!isTransitioning) goTo(i + 1); });
    dotsEl.appendChild(dot);
  });
  const dots = qsa('.hero-dot', dotsEl);

  const syncDots = (idx) => {
    const ri = realIndex(idx);
    dots.forEach((d, i) => {
      d.classList.toggle('is-active', i === ri);
      d.setAttribute('aria-selected', String(i === ri));
    });
  };

  // Content
  const eyebrowEl = qs('#sliderEyebrow', section);
  const h1El      = qs('#sliderH1',      section);
  const descEl    = qs('#sliderDesc',    section);
  const cta1El    = qs('#sliderCta1',    section);
  const cta2El    = qs('#sliderCta2',    section);
  const contentEl = qs('.hero-slider-content', section);

  const updateContent = (ri) => {
    const s = realSlides[ri];
    if (eyebrowEl) eyebrowEl.textContent    = s.dataset.eyebrow   || '';
    if (h1El)      h1El.textContent         = s.dataset.h1        || '';
    if (descEl)    descEl.textContent       = s.dataset.desc      || '';
    if (cta1El) { cta1El.textContent = s.dataset.cta1Text || ''; cta1El.href = s.dataset.cta1Href || '#'; }
    if (cta2El) { cta2El.textContent = s.dataset.cta2Text || ''; cta2El.href = s.dataset.cta2Href || '#'; }
  };

  const goTo = (idx) => {
    if (isTransitioning || idx === current) return;
    current = idx;
    isTransitioning = true;
    setPos(current, true);
    syncDots(current);
    if (contentEl) {
      contentEl.classList.add('is-fading');
      setTimeout(() => {
        updateContent(realIndex(current));
        contentEl.classList.remove('is-fading');
      }, 220);
    } else {
      updateContent(realIndex(current));
    }
  };

  const nextSlide = () => goTo(current + 1);
  const prevSlide = () => goTo(current - 1);

  const resetTimer = () => {
    clearInterval(autoTimer);
    autoTimer = setInterval(nextSlide, INTERVAL);
  };

  const prevBtn = qs('#sliderPrev', section);
  const nextBtn = qs('#sliderNext', section);
  if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); resetTimer(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); resetTimer(); });

  section.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  { prevSlide(); resetTimer(); }
    if (e.key === 'ArrowRight') { nextSlide(); resetTimer(); }
  });

  section.addEventListener('mouseenter', () => clearInterval(autoTimer));
  section.addEventListener('mouseleave', resetTimer);

  let touchStartX = 0;
  section.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  section.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) { dx < 0 ? nextSlide() : prevSlide(); resetTimer(); }
  }, { passive: true });

  setPos(1, false);
  updateContent(0);
  syncDots(1);
  resetTimer();
}

function initNavActivePage() {
  const links = qsa('.nav > a:not([href^="#"])');
  if (!links.length) return;

  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  links.forEach((a) => {
    const href = a.getAttribute("href").split("#")[0];
    if (href === currentPage && !a.classList.contains("active")) {
      a.classList.add("active");
    }
  });
}

function initNavActiveSection() {
  const navLinks = qsa('.nav > a[href^="#"]');
  if (!navLinks.length) return;

  navLinks[0].classList.add("active");

  if (!("IntersectionObserver" in window)) return;

  const sectionIds = navLinks.map((a) => a.getAttribute("href").slice(1));
  const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

  const setActive = (id) => {
    navLinks.forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === "#" + id);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
  );

  sections.forEach((s) => observer.observe(s));
}

function initGalleryLightbox() {
  const grids = qsa(".gallery-grid");
  if (!grids.length) return;

  // Broken image placeholder
  qsa(".gallery-item img").forEach((img) => {
    img.addEventListener("error", () => {
      img.classList.add("img-error");
      const fig = img.closest(".gallery-item");
      if (fig) {
        fig.classList.add("img-broken");
        fig.dataset.name = img.src.split("/").pop();
      }
    });
  });

  // Build lightbox DOM once
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.setAttribute("role", "dialog");
  lb.setAttribute("aria-modal", "true");
  lb.innerHTML = `
    <div class="lightbox-inner">
      <button class="lightbox-close" aria-label="Close">&times;</button>
      <button class="lightbox-nav prev" aria-label="Previous">&#8249;</button>
      <img class="lightbox-img" src="" alt="" />
      <button class="lightbox-nav next" aria-label="Next">&#8250;</button>
      <div class="lightbox-caption"></div>
      <div class="lightbox-counter"></div>
      <div class="lightbox-thumbs"></div>
    </div>
  `;
  document.body.appendChild(lb);

  const imgEl = qs(".lightbox-img", lb);
  const captionEl = qs(".lightbox-caption", lb);
  const counterEl = qs(".lightbox-counter", lb);
  const thumbsEl = qs(".lightbox-thumbs", lb);
  const closeBtn = qs(".lightbox-close", lb);
  const prevBtn = qs(".lightbox-nav.prev", lb);
  const nextBtn = qs(".lightbox-nav.next", lb);

  let items = [];
  let current = 0;

  const show = (index) => {
    current = (index + items.length) % items.length;
    const { src, alt, caption } = items[current];
    imgEl.src = src;
    imgEl.alt = alt;
    captionEl.textContent = caption;
    counterEl.textContent = items.length > 1 ? `${current + 1} / ${items.length}` : "";
    prevBtn.style.display = items.length > 1 ? "" : "none";
    nextBtn.style.display = items.length > 1 ? "" : "none";
    qsa(".lightbox-thumb", lb).forEach((t, i) => {
      t.classList.toggle("is-active", i === current);
    });
  };

  const buildThumbs = () => {
    thumbsEl.innerHTML = "";
    if (items.length <= 1) return;
    items.forEach(({ src, alt }, i) => {
      const btn = document.createElement("button");
      btn.className = "lightbox-thumb";
      btn.setAttribute("aria-label", `View image ${i + 1}`);
      btn.innerHTML = `<img src="${src}" alt="${alt}" />`;
      btn.addEventListener("click", () => show(i));
      thumbsEl.appendChild(btn);
    });
  };

  const open = (galleryItems, startIndex) => {
    items = galleryItems;
    buildThumbs();
    lb.classList.add("is-open");
    document.body.style.overflow = "hidden";
    show(startIndex);
    closeBtn.focus();
  };

  const close = () => {
    lb.classList.remove("is-open");
    document.body.style.overflow = "";
  };

  grids.forEach((grid) => {
    const figures = qsa(".gallery-item", grid);
    const galleryItems = figures.map((fig) => {
      const img = qs("img", fig);
      const cap = qs("figcaption", fig);
      return {
        src: img ? img.src : "",
        alt: img ? img.alt : "",
        caption: cap ? cap.textContent : "",
      };
    });

    figures.forEach((fig, i) => {
      fig.addEventListener("click", () => open(galleryItems, i));
    });
  });

  closeBtn.addEventListener("click", close);
  prevBtn.addEventListener("click", () => show(current - 1));
  nextBtn.addEventListener("click", () => show(current + 1));

  lb.addEventListener("click", (e) => {
    if (e.target === lb) close();
  });

  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });
}

function initProductCardImages() {
  const cards = Array.from(document.querySelectorAll(".product-card-media"));
  cards.forEach((media) => {
    const img = media.querySelector("img");
    if (!img) return;
    media.dataset.name = img.src.split("/").pop();
    img.addEventListener("error", () => {
      img.classList.add("img-error");
      media.classList.add("img-broken");
    });
  });
}

function initPageLoad() {
  // Double rAF: first frame lets the browser process the newly-parsed DOM,
  // second frame ensures IntersectionObserver has fired for above-the-fold
  // elements (so reveal transitions and the body fade-in start together).
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.body.classList.add("page-loaded");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initReveal();
  initMotionBackground();
  initHeroVideo();
  initHeroSlider();
  initScrollStory();
  initNavActivePage();
  initNavActiveSection();
  initGalleryLightbox();
  initProductCardImages();
  initPageLoad();
});
