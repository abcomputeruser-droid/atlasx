const optimizerQuery = (selector, scope = document) => scope.querySelector(selector);
const optimizerQueryAll = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const OPTIMIZER_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const OPTIMIZER_WIDTHS = {
  priority: [640, 960, 1280, 1600],
  default: [320, 640, 960, 1280],
};

function isVercelOptimizationEnabled() {
  const provider = optimizerQuery('meta[name="deployment-provider"]')?.content;
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  return protocol.startsWith("http") && provider === "vercel" && !OPTIMIZER_HOSTS.has(host);
}

function isOptimizableLocalImage(src) {
  return Boolean(
    src &&
      !src.startsWith("data:") &&
      !src.startsWith("http") &&
      !src.startsWith("/_vercel/image") &&
      src.startsWith("assets/images/") &&
      !src.endsWith(".svg")
  );
}

function toOptimizerUrl(src, width, quality = 78) {
  const normalized = src.startsWith("/") ? src : `/${src}`;
  return `/_vercel/image?url=${encodeURIComponent(normalized)}&w=${width}&q=${quality}`;
}

function inferSizes(img, priority) {
  if (img.closest(".product-card-media")) {
    return "(min-width: 1200px) 280px, (min-width: 768px) 45vw, 100vw";
  }

  if (img.closest(".gallery-grid")) {
    return "(min-width: 1200px) 30vw, (min-width: 768px) 45vw, 100vw";
  }

  if (img.closest(".hero-media, .product-hero-card, .banner-media, .scroll-frame")) {
    return "(min-width: 1200px) 50vw, 100vw";
  }

  return priority ? "(min-width: 1200px) 50vw, 100vw" : "100vw";
}

function setImageLoading(img, priority) {
  if (!img.hasAttribute("decoding")) {
    img.decoding = priority ? "sync" : "async";
  }

  if (!img.hasAttribute("loading")) {
    img.loading = priority ? "eager" : "lazy";
  }

  if (priority && !img.hasAttribute("fetchpriority")) {
    img.fetchPriority = "high";
  }
}

function applyResponsiveOptimization(img) {
  const src = img.getAttribute("src");
  if (!isOptimizableLocalImage(src)) return;

  const priority =
    img.matches("#scrollImage") ||
    img.closest(".product-hero-card, .hero-media, .banner-media") !== null;

  setImageLoading(img, priority);

  if (!isVercelOptimizationEnabled()) return;
  if (img.dataset.optimizerApplied === src) return;

  const widths = priority ? OPTIMIZER_WIDTHS.priority : OPTIMIZER_WIDTHS.default;
  img.srcset = widths.map((width) => `${toOptimizerUrl(src, width)} ${width}w`).join(", ");

  if (!img.hasAttribute("sizes")) {
    img.sizes = inferSizes(img, priority);
  }

  img.dataset.optimizerApplied = src;
}

function optimizeDataAttribute(element, attributeName, width = 1280) {
  const src = element.getAttribute(attributeName);
  if (!isOptimizableLocalImage(src) || !isVercelOptimizationEnabled()) return;
  element.setAttribute(attributeName, toOptimizerUrl(src, width));
}

function optimizeScrollStoryAssets() {
  const scrollImage = optimizerQuery("#scrollImage");
  if (scrollImage) {
    setImageLoading(scrollImage, true);

    const originalSrc = scrollImage.getAttribute("src");
    if (isOptimizableLocalImage(originalSrc) && isVercelOptimizationEnabled()) {
      const optimizedSrc = toOptimizerUrl(originalSrc, 1600);
      scrollImage.setAttribute("src", optimizedSrc);
      if (scrollImage.dataset.src) {
        scrollImage.dataset.src = optimizedSrc;
      }
    }
  }

  optimizerQueryAll("[data-image]").forEach((node) => optimizeDataAttribute(node, "data-image", 1600));
}

function optimizeNode(node) {
  if (!(node instanceof Element)) return;

  if (node.matches("img")) {
    applyResponsiveOptimization(node);
  }

  optimizerQueryAll("img", node).forEach(applyResponsiveOptimization);
}

document.addEventListener("DOMContentLoaded", () => {
  optimizeScrollStoryAssets();
  optimizerQueryAll("img").forEach(applyResponsiveOptimization);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes" && mutation.target instanceof Element) {
        optimizeNode(mutation.target);
        if (mutation.attributeName === "data-image") {
          optimizeDataAttribute(mutation.target, "data-image", 1600);
        }
        return;
      }

      mutation.addedNodes.forEach(optimizeNode);
    });
  });

  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["src", "data-image"],
  });
});
