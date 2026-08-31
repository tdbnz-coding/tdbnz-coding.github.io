(() => {
  "use strict";

  const config = window.TRAVEL_CONFIG || {};
  const links = config.affiliateLinks || {};
  const serviceCopy = {
    flights: {
      origin: "Leaving from",
      destination: "Going to",
      destinationPlaceholder: "Where to?",
      start: "Depart",
      end: "Return",
      travellers: "Travellers",
      button: "Search flights",
      needsOrigin: true,
      needsEndDate: true
    },
    hotels: {
      origin: "",
      destination: "Destination or hotel",
      destinationPlaceholder: "City or hotel",
      start: "Check in",
      end: "Check out",
      travellers: "Guests",
      button: "Search hotels",
      needsOrigin: false,
      needsEndDate: true
    },
    cars: {
      origin: "",
      destination: "Pick-up location",
      destinationPlaceholder: "Airport or city",
      start: "Pick up",
      end: "Drop off",
      travellers: "Drivers",
      button: "Search car hire",
      needsOrigin: false,
      needsEndDate: true
    },
    tours: {
      origin: "",
      destination: "Destination",
      destinationPlaceholder: "Where are you going?",
      start: "From",
      end: "To",
      travellers: "People",
      button: "Find activities",
      needsOrigin: false,
      needsEndDate: false
    }
  };

  let activeService = "flights";
  let toastTimer;

  const form = document.querySelector("[data-travel-form]");
  const originField = document.querySelector("[data-origin-field]");
  const endDateField = document.querySelector("[data-end-date-field]");
  const originLabel = document.querySelector("[data-origin-label]");
  const destinationLabel = document.querySelector("[data-destination-label]");
  const startLabel = document.querySelector("[data-start-label]");
  const endLabel = document.querySelector("[data-end-label]");
  const travellersLabel = document.querySelector("[data-travellers-label]");
  const searchLabel = document.querySelector("[data-search-label]");
  const toast = document.querySelector("[data-toast]");

  const escapeText = (value) => String(value || "").trim();

  const setMinimumDates = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const isoToday = today.toISOString().split("T")[0];
    const isoTomorrow = tomorrow.toISOString().split("T")[0];
    const startInput = form.elements.startDate;
    const endInput = form.elements.endDate;
    startInput.min = isoToday;
    endInput.min = isoTomorrow;
    if (!startInput.value) startInput.value = isoTomorrow;
    const defaultEnd = new Date(tomorrow);
    defaultEnd.setDate(tomorrow.getDate() + 7);
    if (!endInput.value) endInput.value = defaultEnd.toISOString().split("T")[0];
  };

  const showToast = (message) => {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 4500);
  };

  const linkWithTracking = (service, subId) => {
    const link = links[service];
    if (!link) return "";
    try {
      const url = new URL(link, window.location.href);
      const isTravelpayoutsLink = /(^|\.)tp\.st$|travelpayouts/i.test(url.hostname);
      if (isTravelpayoutsLink && subId) url.searchParams.set("sub_id", subId);
      return url.toString();
    } catch {
      return link;
    }
  };

  const openPartner = (service, subId) => {
    const link = linkWithTracking(service, subId);
    if (!link) {
      showToast("This travel option is being connected. Please try another category.");
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const selectService = (service) => {
    const copy = serviceCopy[service];
    if (!copy) {
      openPartner(service, `homepage-${service}`);
      return;
    }

    activeService = service;
    document.querySelectorAll(".service-tab").forEach((tab) => {
      const selected = tab.dataset.service === service;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
    });

    originField.hidden = !copy.needsOrigin;
    originField.querySelector("input").required = copy.needsOrigin;
    endDateField.hidden = !copy.needsEndDate;
    endDateField.querySelector("input").required = copy.needsEndDate;
    originLabel.textContent = copy.origin;
    destinationLabel.textContent = copy.destination;
    form.elements.destination.placeholder = copy.destinationPlaceholder;
    startLabel.textContent = copy.start;
    endLabel.textContent = copy.end;
    travellersLabel.textContent = copy.travellers;
    searchLabel.textContent = copy.button;
  };

  document.querySelectorAll("[data-site-name]").forEach((node) => {
    node.textContent = config.siteName || "Travel Deals NZ";
  });
  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  document.querySelectorAll(".service-tab").forEach((tab) => {
    tab.addEventListener("click", () => selectService(tab.dataset.service));
  });

  document.querySelectorAll("[data-quick-link]").forEach((button) => {
    button.addEventListener("click", () => openPartner(button.dataset.quickLink, `service-card-${button.dataset.quickLink}`));
  });

  document.querySelectorAll("[data-extra-services] [data-service]").forEach((button) => {
    button.addEventListener("click", () => openPartner(button.dataset.service, `more-options-${button.dataset.service}`));
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const destination = escapeText(form.elements.destination.value);
    const startDate = form.elements.startDate.value;
    const endDate = form.elements.endDate.value;
    if (endDateField.hidden === false && endDate && startDate && endDate < startDate) {
      showToast("Please choose an end date after your start date.");
      form.elements.endDate.focus();
      return;
    }

    const subIdDestination = destination.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 28);
    openPartner(activeService, `search-${activeService}-${subIdDestination || "general"}`);
  });

  form.elements.startDate.addEventListener("change", () => {
    const start = form.elements.startDate.value;
    if (!start) return;
    form.elements.endDate.min = start;
    if (form.elements.endDate.value < start) form.elements.endDate.value = start;
  });

  const moreButton = document.querySelector("[data-more-services]");
  const extraServices = document.querySelector("[data-extra-services]");
  moreButton.addEventListener("click", () => {
    const opening = extraServices.hidden;
    extraServices.hidden = !opening;
    moreButton.setAttribute("aria-expanded", String(opening));
    moreButton.querySelector("span").textContent = opening ? "−" : "＋";
  });

  const header = document.querySelector("[data-header]");
  const menuButton = document.querySelector("[data-menu-button]");
  const primaryNav = header.querySelector("nav");
  window.addEventListener("scroll", () => header.classList.toggle("is-stuck", window.scrollY > 50), { passive: true });
  menuButton.addEventListener("click", () => {
    const opening = !primaryNav.classList.contains("is-open");
    primaryNav.classList.toggle("is-open", opening);
    menuButton.setAttribute("aria-expanded", String(opening));
    menuButton.setAttribute("aria-label", opening ? "Close menu" : "Open menu");
  });
  primaryNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      primaryNav.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  });

  document.querySelectorAll("[data-dialog-open]").forEach((button) => {
    button.addEventListener("click", () => document.getElementById(button.dataset.dialogOpen).showModal());
  });
  document.querySelectorAll("[data-dialog-close]").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  setMinimumDates();
  selectService("flights");
})();
