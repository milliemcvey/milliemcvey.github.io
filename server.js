const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "localhost";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "millie";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-this-password";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const MAX_JSON_BODY_BYTES = 1024 * 64;
const ROOT_DIR = __dirname;
const PROJECTS_FILE = path.join(ROOT_DIR, "data", "projects.json");
const PROJECT_CATEGORIES = new Set(["web", "data", "ml", "apps"]);
const PUBLIC_PATH_PREFIXES = ["/HTML/", "/SCRIPT/", "/STYLING/"];
const sessions = new Map();
let projectsLock = Promise.resolve();

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);

    if (requestUrl.pathname.startsWith("/api/")) {
      await handleApi(request, response, requestUrl);
      return;
    }

    await serveStatic(requestUrl.pathname, response);
  } catch (error) {
    console.error(error);
    sendJson(response, error.statusCode || 500, {
      error: error.statusCode ? error.message : "Something went wrong on the server."
    });
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the existing server or set PORT to another value.`);
    process.exit(1);
  }

  throw error;
});

server.listen(PORT, HOST, () => {
  console.log(`Portfolio running at http://${HOST}:${PORT}`);
  console.log(`Admin username: ${ADMIN_USERNAME}`);
  if (ADMIN_PASSWORD === "change-this-password") {
    console.warn("Using the default admin password. Set ADMIN_PASSWORD before deploying.");
  }
});

async function handleApi(request, response, requestUrl) {
  if (request.method === "GET" && requestUrl.pathname === "/api/projects") {
    sendJson(response, 200, await readProjects());
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/login") {
    const body = await readJsonBody(request);

    if (body.username !== ADMIN_USERNAME || body.password !== ADMIN_PASSWORD) {
      sendJson(response, 401, { error: "Invalid username or password." });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, Date.now() + SESSION_TTL_MS);
    setSessionCookie(response, token, request);
    sendJson(response, 200, { username: ADMIN_USERNAME });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/logout") {
    const token = getSessionToken(request);
    sessions.delete(token);
    clearSessionCookie(response, request);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/me") {
    if (!isAuthenticated(request)) {
      sendJson(response, 401, { error: "Not logged in." });
      return;
    }

    sendJson(response, 200, { username: ADMIN_USERNAME });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/projects") {
    if (!isAuthenticated(request)) {
      sendJson(response, 401, { error: "Not logged in." });
      return;
    }

    const input = await readJsonBody(request);
    const project = await withProjectsLock(async () => {
      const projects = await readProjects();
      const nextProject = validateProject(input, projects);
      projects.unshift(nextProject);
      await writeProjects(projects);
      return nextProject;
    });

    sendJson(response, 201, project);
    return;
  }

  if (request.method === "DELETE" && requestUrl.pathname.startsWith("/api/projects/")) {
    if (!isAuthenticated(request)) {
      sendJson(response, 401, { error: "Not logged in." });
      return;
    }

    const projectId = decodeURIComponent(requestUrl.pathname.slice("/api/projects/".length)).trim();
    await deleteProjectById(response, projectId);
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/projects/delete") {
    if (!isAuthenticated(request)) {
      sendJson(response, 401, { error: "Not logged in." });
      return;
    }

    const body = await readJsonBody(request);
    const projectId = cleanText(body.id);
    await deleteProjectById(response, projectId);
    return;
  }

  sendJson(response, 404, { error: "API route not found." });
}

async function serveStatic(pathname, response) {
  const cleanPath = pathname === "/" ? "/HTML/index.html" : safeDecodePath(pathname);
  const filePath = path.resolve(ROOT_DIR, `.${cleanPath}`);

  if (!isPublicPath(cleanPath) || !isPathInsideRoot(filePath)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const headers = {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff"
    };

    if ([".css", ".js", ".png", ".jpg", ".jpeg", ".svg", ".webp"].includes(extension)) {
      headers["Cache-Control"] = "public, max-age=3600";
    }

    response.writeHead(200, headers);
    response.end(file);
  } catch {
    sendText(response, 404, "Page not found");
  }
}

async function readProjects() {
  const file = await fs.readFile(PROJECTS_FILE, "utf8");
  const projects = JSON.parse(file);
  return projects.map((project) => ({
    ...project,
    category: normalizeCategory(project.category) || "data"
  }));
}

async function writeProjects(projects) {
  await fs.mkdir(path.dirname(PROJECTS_FILE), { recursive: true });
  const temporaryFile = `${PROJECTS_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryFile, `${JSON.stringify(projects, null, 2)}\n`);
  await fs.rename(temporaryFile, PROJECTS_FILE);
}

async function readJsonBody(request) {
  const chunks = [];
  let byteLength = 0;

  for await (const chunk of request) {
    byteLength += chunk.byteLength;

    if (byteLength > MAX_JSON_BODY_BYTES) {
      const error = new Error("Request body is too large.");
      error.statusCode = 413;
      throw error;
    }

    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function validateProject(input, existingProjects = []) {
  const title = cleanText(input.title);
  const description = cleanText(input.description);
  const category = normalizeCategory(input.category);

  if (!title || !description) {
    const error = new Error("Project title and description are required.");
    error.statusCode = 400;
    throw error;
  }

  if (!category) {
    const error = new Error("Project category must be one of: web, data, ml, apps.");
    error.statusCode = 400;
    throw error;
  }

  return {
    id: uniqueProjectId(title, existingProjects),
    title,
    description,
    category,
    imageUrl: cleanUrl(input.imageUrl, "https://placehold.co/600x400"),
    projectUrl: cleanUrl(input.projectUrl, "#"),
    tags: cleanTags(input.tags),
    featured: Boolean(input.featured),
    createdAt: new Date().toISOString()
  };
}

function cleanText(value) {
  return String(value || "").trim().slice(0, 2000);
}

function normalizeCategory(value) {
  const category = cleanText(value).toLowerCase();
  return PROJECT_CATEGORIES.has(category) ? category : "";
}

async function deleteProjectById(response, projectId) {
  if (!projectId) {
    sendJson(response, 400, { error: "Project id is required." });
    return;
  }

  const deleted = await withProjectsLock(async () => {
    const projects = await readProjects();
    const filteredProjects = projects.filter((project) => project.id !== projectId);

    if (filteredProjects.length === projects.length) {
      return false;
    }

    await writeProjects(filteredProjects);
    return true;
  });

  if (!deleted) {
    sendJson(response, 404, { error: "Project not found." });
    return;
  }

  sendJson(response, 200, { ok: true, id: projectId });
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || crypto.randomUUID();
}

function isAuthenticated(request) {
  const token = getSessionToken(request);
  const expiresAt = sessions.get(token);

  if (!expiresAt || expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }

  sessions.set(token, Date.now() + SESSION_TTL_MS);
  cleanupExpiredSessions();
  return true;
}

function getSessionToken(request) {
  const cookieHeader = request.headers.cookie || "";
  const match = cookieHeader.match(/(?:^|;\s*)portfolio_session=([^;]+)/);
  return match ? match[1] : "";
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(text);
}

function cleanTags(value) {
  const tags = Array.isArray(value) ? value : cleanText(value).split(",");

  return tags
    .map((tag) => cleanText(tag).slice(0, 40))
    .filter(Boolean)
    .slice(0, 12);
}

function cleanUrl(value, fallback) {
  const url = cleanText(value);

  if (!url) {
    return fallback;
  }

  if (url === "#" || url.startsWith("/") || url.startsWith("../") || url.startsWith("./")) {
    return url;
  }

  try {
    const parsedUrl = new URL(url);
    return ["http:", "https:"].includes(parsedUrl.protocol) ? url : fallback;
  } catch {
    return fallback;
  }
}

function uniqueProjectId(title, existingProjects) {
  const baseId = slugify(title);
  const existingIds = new Set(existingProjects.map((project) => project.id));

  if (!existingIds.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  while (existingIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseId}-${suffix}`;
}

function withProjectsLock(task) {
  const run = projectsLock.then(task, task);
  projectsLock = run.catch(() => {});
  return run;
}

function safeDecodePath(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    const error = new Error("Invalid URL path.");
    error.statusCode = 400;
    throw error;
  }
}

function isPathInsideRoot(filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function isPublicPath(pathname) {
  const normalizedPath = pathname.replaceAll("\\", "/");
  return PUBLIC_PATH_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}

function setSessionCookie(response, token, request) {
  const secure = isSecureRequest(request) ? "; Secure" : "";
  response.setHeader("Set-Cookie", `portfolio_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`);
}

function clearSessionCookie(response, request) {
  const secure = isSecureRequest(request) ? "; Secure" : "";
  response.setHeader("Set-Cookie", `portfolio_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
}

function isSecureRequest(request) {
  return request.headers["x-forwarded-proto"] === "https";
}

function cleanupExpiredSessions() {
  const now = Date.now();

  for (const [token, expiresAt] of sessions.entries()) {
    if (expiresAt < now) {
      sessions.delete(token);
    }
  }
}
