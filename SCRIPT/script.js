document.addEventListener("DOMContentLoaded", () => {
  updateGreeting();
  markActiveNavigation();
  addRevealAnimations();
  addBackToTopButton();
  connectButtons();
  setNavShadow();
  renderProjectGrids();
  setupLoginForm();
  setupAdminPage();
});

const fallbackProjects = [
  {
    title: "EPL Predictor Model",
    description: "Linear regression ML model for predicting Premier League table standings.",
    imageUrl: "../HTML/IMAGES/PROJECTS/epl-predictor-graphic.png",
    projectUrl: "#",
    tags: ["Machine Learning", "Python"],
    featured: true
  },
  {
    title: "Netflix Analysis",
    description: "Data analysis and visualization of Netflix content and viewer behaviour.",
    imageUrl: "../HTML/IMAGES/PROJECTS/netflix-analysis-graphic.png",
    projectUrl: "#",
    tags: ["Data Analysis"],
    featured: true
  },
  {
    title: "Weather Data Analysis",
    description: "Analysis and visualization of weather patterns and climate data.",
    imageUrl: "../HTML/IMAGES/PROJECTS/weather-analysis-graphic.png",
    projectUrl: "#",
    tags: ["Visualization", "Python"],
    featured: true
  }
];

function updateGreeting() {
  const greeting = document.querySelector(".hero-content h3");

  if (!greeting) {
    return;
  }

  const hour = new Date().getHours();
  let timeOfDay = "Evening";

  if (hour < 12) {
    timeOfDay = "Morning";
  } else if (hour < 18) {
    timeOfDay = "Afternoon";
  }

  greeting.textContent = `Good ${timeOfDay}`;
}

function markActiveNavigation() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll(".nav-list a");

  navLinks.forEach((link) => {
    const linkPage = link.getAttribute("href").split("/").pop();

    if (linkPage === currentPage) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });

  setupNavIndicator();
}

function setupNavIndicator() {
  const navList = document.querySelector(".nav-list");
  const links = document.querySelectorAll(".nav-list a");
  const activeLink = document.querySelector(".nav-list a.active") || links[0];

  if (!navList || !links.length || !activeLink) {
    return;
  }

  const moveIndicator = (target) => {
    const listRect = navList.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    navList.style.setProperty("--nav-indicator-left", `${targetRect.left - listRect.left}px`);
    navList.style.setProperty("--nav-indicator-top", `${targetRect.top - listRect.top}px`);
    navList.style.setProperty("--nav-indicator-width", `${targetRect.width}px`);
    navList.style.setProperty("--nav-indicator-height", `${targetRect.height}px`);

    links.forEach((link) => link.classList.toggle("indicator-target", link === target));
  };

  const resetIndicator = () => moveIndicator(activeLink);

  requestAnimationFrame(resetIndicator);

  links.forEach((link) => {
    link.addEventListener("mouseenter", () => moveIndicator(link));
    link.addEventListener("focus", () => moveIndicator(link));
  });

  navList.addEventListener("mouseleave", resetIndicator);
  navList.addEventListener("focusout", () => {
    requestAnimationFrame(() => {
      if (!navList.contains(document.activeElement)) {
        resetIndicator();
      }
    });
  });

  window.addEventListener("resize", resetIndicator);
}

function addRevealAnimations() {
  const sections = document.querySelectorAll(
    ".hero-content, .hero-sticker, .card, .editorial-card, .info-section-content, .info-banner, .icon-banner img, .auth-panel, .admin-shell"
  );

  if (!("IntersectionObserver" in window)) {
    sections.forEach((section) => section.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  sections.forEach((section) => {
    section.classList.add("reveal");
    observer.observe(section);
  });
}

function addBackToTopButton() {
  const button = document.createElement("button");

  button.className = "back-to-top";
  button.type = "button";
  button.textContent = "^";
  button.setAttribute("aria-label", "Back to top");

  document.body.appendChild(button);

  button.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", () => {
    button.classList.toggle("visible", window.scrollY > 450);
  });
}

function connectButtons() {
  const destinations = {
    "view my work": "../HTML/projects.html",
    "about me": "../HTML/about.html",
    about: "../HTML/about.html",
    contact: "../HTML/contact.html",
    github: "https://github.com/milliemcvey"
  };

  document.querySelectorAll("button.btn").forEach((button) => {
    const label = button.textContent.trim().toLowerCase();
    let destination = destinations[label];

    if (label === "view more") {
      destination = button.closest(".about-segment")
        ? "../HTML/about.html"
        : "../HTML/projects.html";
    }

    if (!destination || button.type === "submit" || button.hasAttribute("data-logout")) {
      return;
    }

    button.addEventListener("click", () => {
      if (destination.startsWith("http")) {
        window.open(destination, "_blank", "noopener,noreferrer");
        return;
      }

      window.location.href = destination;
    });
  });

  document.querySelectorAll("footer a").forEach((link) => {
    const label = link.textContent.trim().toLowerCase();

    if (label === "about") {
      link.href = "../HTML/about.html";
    }

    if (label === "projects" || label === "projects library") {
      link.href = "../HTML/projects.html";
    }

    if (label === "contact") {
      link.href = "../HTML/contact.html";
    }

    if (label === "admin" || label === "admin login") {
      link.href = "../HTML/login.html";
    }

    if (label === "github profile") {
      link.href = "https://github.com/milliemcvey";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
  });
}

function setNavShadow() {
  const nav = document.querySelector(".nav");

  if (!nav) {
    return;
  }

  const updateNav = () => {
    nav.classList.toggle("scrolled", window.scrollY > 10);
  };

  updateNav();
  window.addEventListener("scroll", updateNav);
}

async function renderProjectGrids() {
  const grids = document.querySelectorAll("[data-project-grid]");

  if (!grids.length) {
    return;
  }

  const projects = await getProjects();

  grids.forEach((grid) => {
    const limit = Number(grid.dataset.limit || projects.length);
    const visibleProjects = projects
      .filter((project) => grid.dataset.limit ? project.featured !== false : true)
      .slice(0, limit);

    grid.innerHTML = "";

    if (!visibleProjects.length) {
      grid.innerHTML = '<p class="loading-message">No projects added yet.</p>';
      return;
    }

    visibleProjects.forEach((project) => {
      grid.appendChild(createProjectCard(project));
    });
  });
}

async function getProjects() {
  try {
    const response = await fetch("/api/projects");

    if (!response.ok) {
      throw new Error("Could not load projects.");
    }

    return await response.json();
  } catch {
    return fallbackProjects;
  }
}

function createProjectCard(project) {
  const card = document.createElement("article");
  const tags = Array.isArray(project.tags) ? project.tags : [];

  card.className = "card secondary-div";
  card.innerHTML = `
    <img src="${escapeAttribute(project.imageUrl || "https://placehold.co/600x400")}" alt="${escapeAttribute(project.title)} project preview">
    <div class="card-contents">
      <h3>${escapeHtml(project.title)}</h3>
      <p>${escapeHtml(project.description)}</p>
      ${tags.length ? `<div class="tag-list">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
      <div class="btn-box">
        <a class="btn" href="${escapeAttribute(project.projectUrl || "#")}" ${project.projectUrl && project.projectUrl !== "#" ? 'target="_blank" rel="noopener noreferrer"' : ""}>View</a>
      </div>
    </div>
  `;

  return card;
}

function setupLoginForm() {
  const form = document.querySelector("[data-login-form]");

  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = form.querySelector("[data-form-message]");
    const formData = new FormData(form);

    setMessage(message, "Checking details...");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData))
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Login failed.");
      }

      window.location.href = "../HTML/admin.html";
    } catch (error) {
      setMessage(message, error.message, true);
    }
  });
}

async function setupAdminPage() {
  const form = document.querySelector("[data-project-form]");

  if (!form) {
    return;
  }

  const authenticated = await confirmAdminSession();

  if (!authenticated) {
    window.location.href = "../HTML/login.html";
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = form.querySelector("[data-form-message]");
    const payload = Object.fromEntries(new FormData(form));

    payload.featured = form.elements.featured.checked;
    setMessage(message, "Saving project...");

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not save project.");
      }

      form.reset();
      form.elements.featured.checked = true;
      setMessage(message, "Project added.");
      await renderProjectGrids();
    } catch (error) {
      setMessage(message, error.message, true);
    }
  });

  document.querySelector("[data-logout]")?.addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "../HTML/login.html";
  });
}

async function confirmAdminSession() {
  try {
    const response = await fetch("/api/me");
    return response.ok;
  } catch {
    return false;
  }
}

function setMessage(element, text, isError = false) {
  if (!element) {
    return;
  }

  element.textContent = text;
  element.classList.toggle("error", isError);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
