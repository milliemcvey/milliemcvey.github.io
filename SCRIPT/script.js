document.addEventListener("DOMContentLoaded", () => {
  updateGreeting();
  markActiveNavigation();
  addRevealAnimations();
  addBackToTopButton();
  connectButtons();
  setNavShadow();
  renderProjectGrids();
  setupProjectDetailPage();
  setupLoginForm();
  setupAdminPage();
});

const VALID_CATEGORIES = ["web", "data", "ml", "apps"];
let allProjects = [];
let currentCategoryFilter = "all";

const fallbackProjects = [
  {
    id: "epl-predictor-model",
    title: "EPL Predictor Model",
    description: "Linear regression ML model for predicting Premier League table standings.",
    category: "ml",
    imageUrl: "../HTML/IMAGES/PROJECTS/epl-predictor-graphic.png",
    projectUrl: "#",
    tags: ["Python", "Scikit-learn", "Pandas"],
    featured: true
  },
  {
    id: "netflix-analysis",
    title: "Netflix Analysis",
    description: "Data analysis and visualization of Netflix content and viewer behaviour.",
    category: "data",
    imageUrl: "../HTML/IMAGES/PROJECTS/netflix-analysis-graphic.png",
    projectUrl: "#",
    tags: ["Python", "Pandas", "Matplotlib"],
    featured: true
  },
  {
    id: "weather-data-analysis",
    title: "Weather Data Analysis",
    description: "Analysis and visualization of weather patterns and climate data.",
    category: "data",
    imageUrl: "../HTML/IMAGES/PROJECTS/weather-analysis-graphic.png",
    projectUrl: "#",
    tags: ["Python", "Pandas", "Matplotlib"],
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
  const activePage = currentPage === "project-detail.html" ? "projects.html" : currentPage;
  const navLinks = document.querySelectorAll(".nav-list a");

  navLinks.forEach((link) => {
    const linkPage = link.getAttribute("href").split("/").pop();

    if (linkPage === activePage) {
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
    setupCategoryFilters();
    return;
  }

  allProjects = normalizeProjects(await getProjects());

  grids.forEach((grid) => {
    const limit = Number(grid.dataset.limit || allProjects.length);
    const visibleProjects = allProjects
      .filter((project) => grid.dataset.limit ? project.featured !== false : true)
      .filter((project) => (grid.dataset.limit || currentCategoryFilter === "all")
        ? true
        : project.category === currentCategoryFilter)
      .slice(0, limit);

    grid.innerHTML = "";

    if (!visibleProjects.length) {
      grid.innerHTML = '<p class="loading-message">No projects added yet.</p>';
      return;
    }

    visibleProjects.forEach((project) => {
      const showAdminDelete = Boolean(project.id) && Boolean(grid.closest(".admin-preview"));
      grid.appendChild(createProjectCard(project, { showAdminDelete }));
    });
  });

  setupCategoryFilters();
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

function normalizeProjects(projects) {
  if (!Array.isArray(projects)) {
    return [];
  }

  return projects.map((project) => {
    const category = normalizeCategory(project?.category);

    return {
      ...project,
      category: category || "data"
    };
  });
}

function normalizeCategory(value) {
  const category = String(value || "").trim().toLowerCase();
  return VALID_CATEGORIES.includes(category) ? category : "";
}

function formatCategory(category) {
  const normalized = normalizeCategory(category);

  if (!normalized) {
    return "Data";
  }

  if (normalized === "ml") {
    return "ML";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function createProjectCard(project, options = {}) {
  const card = document.createElement("article");
  const tags = Array.isArray(project.tags) ? project.tags : [];
  const { showAdminDelete = false } = options;
  const detailUrl = project.id
    ? `../HTML/project-detail.html?id=${encodeURIComponent(project.id)}`
    : project.projectUrl || "#";
  const visibleTags = tags
    .map((tag) => ({ tag: String(tag || "").trim(), className: getTagClass(tag) }))
    .filter(({ tag }) => tag);

  card.className = "card secondary-div";
  card.innerHTML = `
    <img src="${escapeAttribute(project.imageUrl || "https://placehold.co/600x400")}" alt="${escapeAttribute(project.title)} project preview">
    <div class="card-contents">
      <div class="project-category">${escapeHtml(formatCategory(project.category))}</div>
      <h3>${escapeHtml(project.title)}</h3>
      <p>${escapeHtml(project.description)}</p>
      ${visibleTags.length ? `<div class="tag-list">${visibleTags.map(({ tag, className }) => `<span class="${className}">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
      <div class="btn-box">
        <a class="btn" href="${escapeAttribute(detailUrl)}">View</a>
        ${showAdminDelete ? `<button class="btn btn-delete" type="button" data-delete-project="${escapeAttribute(project.id)}">Delete</button>` : ""}
      </div>
    </div>
  `;

  return card;
}

function setupCategoryFilters() {
  const container = document.querySelector("[data-project-filters]");

  if (!container) {
    return;
  }

  const buttons = container.querySelectorAll("[data-category-filter]");
  const validFilters = new Set(["all", ...VALID_CATEGORIES]);

  buttons.forEach((button) => {
    const category = String(button.dataset.categoryFilter || "").toLowerCase();
    button.classList.toggle("active", category === currentCategoryFilter);

    if (!button.dataset.boundFilter) {
      button.dataset.boundFilter = "true";
      button.addEventListener("click", () => {
        if (!validFilters.has(category)) {
          return;
        }

        currentCategoryFilter = category;
        renderProjectGrids();
      });
    }
  });
}

function getTagClass(tag) {
  const normalizedTag = String(tag || "").toLowerCase();
  const languages = ["python", "javascript", "typescript", "html", "css", "java", "c++"];
  const libraries = [
    "api",
    "backend",
    "express",
    "frontend",
    "full-stack",
    "matplotlib",
    "next.js",
    "node",
    "node.js",
    "numpy",
    "pandas",
    "react",
    "scikit-learn",
    "seaborn",
    "vue"
  ];

  if (languages.includes(normalizedTag)) {
    return "tag-language";
  }

  if (libraries.includes(normalizedTag)) {
    return "tag-library";
  }

  return "tag-library";
}

async function setupProjectDetailPage() {
  const detailRoot = document.querySelector("[data-project-detail]");

  if (!detailRoot) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("id");
  const projects = normalizeProjects(await getProjects());
  const project = projects.find((item) => item.id === projectId);

  if (!project) {
    detailRoot.innerHTML = `
      <section class="project-detail-empty secondary-div">
        <p class="eyebrow">Project details</p>
        <h1>Project not found</h1>
        <p>This project may have been removed or the link may be out of date.</p>
        <div class="btn-box">
          <a class="btn" href="../HTML/projects.html">Back to Projects</a>
        </div>
      </section>
    `;
    document.title = "Project Not Found | Millie McVey";
    return;
  }

  document.title = `${project.title} | Millie McVey`;
  detailRoot.innerHTML = createProjectDetail(project);
}

function createProjectDetail(project) {
  const tags = Array.isArray(project.tags) ? project.tags : [];
  const visibleTags = tags
    .map((tag) => ({ tag: String(tag || "").trim(), className: getTagClass(tag) }))
    .filter(({ tag }) => tag);
  const formattedDate = project.createdAt
    ? new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(project.createdAt))
    : "In progress";
  const projectLink = project.projectUrl && project.projectUrl !== "#"
    ? `<a class="btn" href="${escapeAttribute(project.projectUrl)}" target="_blank" rel="noopener noreferrer">Open Project</a>`
    : "";

  return `
    <section class="project-detail-hero main-div">
      <div class="project-detail-copy">
        <a class="project-back-link" href="../HTML/projects.html">Back to Projects</a>
        <p class="eyebrow">${escapeHtml(formatCategory(project.category))} project</p>
        <h1>${escapeHtml(project.title)}</h1>
        <p>${escapeHtml(project.description)}</p>
        ${visibleTags.length ? `<div class="tag-list project-detail-tags">${visibleTags.map(({ tag, className }) => `<span class="${className}">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
        <div class="btn-box">
          ${projectLink}
          <a class="btn project-detail-contact-btn" href="../HTML/contact.html">Contact</a>
        </div>
      </div>
      <figure class="project-detail-media">
        <img src="${escapeAttribute(project.imageUrl || "https://placehold.co/1536x1024")}" alt="${escapeAttribute(project.title)} project preview">
      </figure>
    </section>

    <section class="project-detail-body main-div">
      <article class="project-detail-panel project-detail-overview">
        <p class="eyebrow">Overview</p>
        <h2>Project snapshot</h2>
        <p>${escapeHtml(project.description)}</p>
        <p>This page is a front-end template preview. The copy and structure can be refined here before adding backend support for richer project details.</p>
      </article>

      <aside class="project-detail-panel project-detail-facts">
        <dl>
          <div>
            <dt>Category</dt>
            <dd>${escapeHtml(formatCategory(project.category))}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>${project.featured === false ? "Library project" : "Featured project"}</dd>
          </div>
          <div>
            <dt>Added</dt>
            <dd>${escapeHtml(formattedDate)}</dd>
          </div>
        </dl>
      </aside>
    </section>

    <section class="project-detail-story main-div">
      <article class="project-detail-panel project-content-block">
        <div class="project-content-copy">
          <p class="eyebrow">Purpose</p>
          <h2>Why this project matters</h2>
          <p>Use this space to explain the purpose this project holds: the problem it responds to, the skill it was designed to strengthen, or the reason it belongs in the portfolio.</p>
        </div>
        <figure class="project-content-image">
          <img src="${escapeAttribute(project.imageUrl || "https://placehold.co/1536x1024")}" alt="${escapeAttribute(project.title)} supporting visual">
        </figure>
      </article>

      <section class="project-detail-panel project-detail-note">
        <div>
          <span>01.</span>
          <h3>Approach</h3>
          <p>Summarise the method, tools, dataset, or design decisions behind the project.</p>
        </div>
      </section>

      <section class="project-detail-panel project-detail-note">
        <div>
          <span>02.</span>
          <h3>Outcome</h3>
          <p>Highlight the finished result, what changed, or what the project demonstrates.</p>
        </div>
      </section>

      <section class="project-detail-panel project-detail-note">
        <div>
          <span>03.</span>
          <h3>Next steps</h3>
          <p>Note what could be improved, extended, tested, or documented later.</p>
        </div>
      </section>
    </section>
  `;
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

  const previewGrid = document.querySelector(".admin-preview [data-project-grid]");
  const formMessage = form.querySelector("[data-form-message]");

  if (previewGrid && !previewGrid.dataset.boundDelete) {
    previewGrid.dataset.boundDelete = "true";
    previewGrid.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-delete-project]");

      if (!button) {
        return;
      }

      const projectId = button.getAttribute("data-delete-project");

      if (!projectId) {
        return;
      }

      if (!window.confirm("Delete this project card?")) {
        return;
      }

      setMessage(formMessage, "Deleting project...");
      button.disabled = true;

      try {
        const response = await fetch("/api/projects/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: projectId })
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Could not delete project.");
        }

        setMessage(formMessage, "Project deleted.");
        await renderProjectGrids();
      } catch (error) {
        setMessage(formMessage, error.message, true);
      } finally {
        button.disabled = false;
      }
    });
  }

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
