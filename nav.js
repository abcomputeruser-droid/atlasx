/**
 * nav.js — Edit this file to update navigation on every page at once.
 *
 * How it works: each page's <header class="site-header"> carries data
 * attributes that describe what to render. This script reads those
 * attributes and builds the header HTML, so you never touch individual
 * pages just to change a nav link.
 *
 * data-nav          "site" (default) | "home" | "product"
 * data-tagline      Text shown under the Atlas logo  (e.g. "Monitors")
 * data-btn-text     CTA button label                 (e.g. "All Products")
 * data-btn-href     CTA button destination           (e.g. "all-products.html")
 * data-brand-href   Brand logo link                  (default: "index.html")
 *
 * Optional — only needed on monitor.html / motherboard.html so that
 * monitor.js / motherboard.js can find these elements by ID:
 * data-brand-name-id     id placed on the <p class="brand-name">
 * data-brand-tagline-id  id placed on the <p class="brand-tagline">
 * data-nav-id            id placed on the <nav class="nav">
 */

(function () {
  'use strict';

  // ── SITE NAV ─────────────────────────────────────────────────────────
  // Edit these entries to change links shown on every page.
  var SITE_NAV = [
    { label: 'All Products', href: 'all-products.html' },
    { label: 'Motherboards', href: 'motherboard.html'  },
    { label: 'Monitors',     href: 'monitor.html'      },
    { label: 'Company',      href: 'company.html'      },
    { label: 'Support',      href: 'support.html'      },
  ];

  // ── PRODUCT PAGE NAV ─────────────────────────────────────────────────
  // Used on individual product detail pages (data-nav="product").
  var PRODUCT_NAV = [
    { label: 'Overview', href: '#overview' },
    { label: 'Gallery',  href: '#gallery'  },
    { label: 'Specs',    href: '#specs'    },
  ];

  // ── Build & inject ────────────────────────────────────────────────────
  function buildNav(header) {
    var type      = header.dataset.nav       || 'site';
    var tagline   = header.dataset.tagline   || '';
    var btnText   = header.dataset.btnText   || 'All Products';
    var btnHref   = header.dataset.btnHref   || 'all-products.html';
    var brandHref = header.dataset.brandHref || 'index.html';

    var nameId    = header.dataset.brandNameId    ? ' id="' + header.dataset.brandNameId    + '"' : '';
    var taglineId = header.dataset.brandTaglineId ? ' id="' + header.dataset.brandTaglineId + '"' : '';
    var navId     = header.dataset.navId          ? ' id="' + header.dataset.navId          + '"' : '';

    var items = type === 'product' ? PRODUCT_NAV : type === 'site' ? SITE_NAV : [];
    var links = items.map(function (item) {
      return '<a href="' + item.href + '">' + item.label + '</a>';
    }).join('');

    var innerClass = 'header-inner' + (type === 'home' ? ' header-inner--home' : '');

    header.innerHTML =
      '<div class="container ' + innerClass + '">' +
        '<a class="brand" href="' + brandHref + '">' +
          '<span class="brand-mark">' +
            '<img src="assets/images/brand/atlas-logo.svg" alt="Atlas logo" title="Atlas logo" />' +
          '</span>' +
          '<div>' +
            '<p class="brand-name"' + nameId + '>Atlas</p>' +
            '<p class="brand-tagline"' + taglineId + '>' + tagline + '</p>' +
          '</div>' +
        '</a>' +
        (links ? '<nav class="nav"' + navId + '>' + links + '</nav>' : '') +
        '<a class="menu-btn" href="' + btnHref + '">' + btnText + '</a>' +
      '</div>';
  }

  var header = document.querySelector('.site-header');
  if (header) buildNav(header);
}());
