const DATA_URL = "monitor.json";

const el = (id) => document.getElementById(id);

async function loadContent() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`Failed to load ${DATA_URL}: ${response.status}`);
  return response.json();
}

function renderNav(items) {
  const nav = el("monitorNav");
  if (!nav) return;
  nav.innerHTML = "";
  items.forEach((item) => {
    const a = document.createElement("a");
    a.href = item.href;
    a.textContent = item.label;
    nav.appendChild(a);
  });
}

function renderHero(hero) {
  el("heroEyebrow").textContent = hero.eyebrow;
  el("heroTitle").textContent = hero.title;
  el("heroSubtitle").textContent = hero.subtitle;
  const image = el("heroImage");
  image.src = hero.image;
  image.alt = hero.title;

  const chips = el("heroChips");
  chips.innerHTML = "";
  if (Array.isArray(hero.chips)) {
    hero.chips.forEach((chip) => {
      const div = document.createElement("div");
      div.className = "chip";
      div.innerHTML = `
        <span class="chip-value">${chip.value}</span>
        <span class="chip-label">${chip.label}</span>
      `;
      chips.appendChild(div);
    });
  }

  const badges = el("heroBadges");
  badges.innerHTML = "";
  if (Array.isArray(hero.badges)) {
    hero.badges.forEach((badge) => {
      const span = document.createElement("span");
      span.textContent = badge;
      badges.appendChild(span);
    });
  }
  if (!badges.children.length) {
    badges.style.display = "none";
  }
}

function renderOverview(overview) {
  if (!overview) return;
  el("overviewTitle").textContent = overview.title;
  el("overviewBody").textContent = overview.body;

  const stats = el("overviewStats");
  stats.innerHTML = "";
  if (Array.isArray(overview.stats)) {
    overview.stats.forEach((stat) => {
      const card = document.createElement("div");
      card.className = "stat-card";
      card.innerHTML = `
        <span class="stat-value">${stat.value}</span>
        <span class="stat-label">${stat.label}</span>
      `;
      stats.appendChild(card);
    });
  }

  const cards = el("overviewCards");
  cards.innerHTML = "";
  if (Array.isArray(overview.cards)) {
    overview.cards.forEach((item) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3>${item.title}</h3>
        <p>${item.body}</p>
      `;
      cards.appendChild(card);
    });
  }
}

function renderProducts(title, items, tag) {
  el("productsTitle").textContent = title;
  const grid = el("productsGrid");
  grid.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "product-card";
    const features = Array.isArray(item.features) ? item.features : [];
    card.innerHTML = `
      <div class="product-card-media" data-name="${item.image.split("/").pop()}">
        <img src="${item.image}" alt="${item.title}" />
        ${tag ? `<span class="product-card-tag">${tag}</span>` : ""}
      </div>
      <div class="product-card-body">
        <h3>${item.title}</h3>
        <span class="product-card-views"></span>
        ${item.subtitle ? `<p class="product-card-summary">${item.subtitle}</p>` : ""}
        ${features.length ? `<ul class="product-card-specs">${features.map((spec) => `<li>${spec}</li>`).join("")}</ul>` : ""}
        ${item.url ? `<a class="cta stretched-link" href="${item.url}">View Details</a>` : ""}
      </div>
    `;
    const img = card.querySelector("img");
    if (img) {
      img.addEventListener("error", () => {
        img.classList.add("img-error");
        const media = card.querySelector(".product-card-media");
        if (media) media.classList.add("img-broken");
      });
    }
    grid.appendChild(card);
  });
}

function renderSpecs(specs) {
  el("specsTitle").textContent = specs.title;
  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        ${specs.headers.map((header) => `<th>${header}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${specs.rows
        .map(
          (row) => `
        <tr>
          ${row.map((cell) => `<td>${cell}</td>`).join("")}
        </tr>
      `
        )
        .join("")}
    </tbody>
  `;
  const wrapper = el("specsTable");
  wrapper.innerHTML = "";
  wrapper.appendChild(table);
}

function renderFooter(footer) {
  const footerContent = el("footerContent");
  footerContent.innerHTML = `
    <div>
      <h4>Atlas</h4>
      <p>${footer.about}</p>
    </div>
    <div>
      <h4>Resources</h4>
      ${footer.resources.map((link) => `<a href="${link.href}">${link.label}</a>`).join("")}
    </div>
    <div>
      <h4>Follow us</h4>
      ${footer.follow.map((link) => `<a href="${link.href}">${link.label}</a>`).join("")}
    </div>
    <div>
      <h4>Legal</h4>
      ${footer.legal.map((link) => `<a href="${link.href}">${link.label}</a>`).join("")}
    </div>
  `;
  el("footerNote").textContent = footer.note;
}

function initReveal() {
  const sections = document.querySelectorAll(".container");
  sections.forEach((section) => section.classList.add("reveal"));

  const staggerGroups = document.querySelectorAll(
    ".product-grid, .hero-chips, .overview-stats, .cards"
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

async function init() {
  try {
    const data = await loadContent();
    if (el("brandName")) el("brandName").textContent = data.brand.name;
    if (el("brandTagline")) el("brandTagline").textContent = data.brand.tagline;

    renderNav(data.navigation);
    renderHero(data.hero);
    renderOverview(data.overview);
    renderProducts(data.productsTitle, data.products, data.tag);
    renderSpecs(data.specs);
    renderFooter(data.footer);
    initReveal();
    if (typeof window.initViewCounters === "function") window.initViewCounters();
  } catch (err) {
    console.error("Atlas monitors: failed to load content.", err);
  }
}

init();