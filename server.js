const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 3000);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "millie";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-this-password";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const ROOT_DIR = __dirname;
const PROJECTS_FILE = path.join(ROOT_DIR, "data", "projects.json");
const sessions = new Map();

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

server.listen(PORT, () => {
  console.log(`Portfolio running at http://localhost:${PORT}`);
  console.log(`Admin login: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
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
    response.setHeader("Set-Cookie", `portfolio_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`);
    sendJson(response, 200, { username: ADMIN_USERNAME });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/logout") {
    const token = getSessionToken(request);
    sessions.delete(token);
    response.setHeader("Set-Cookie", "portfolio_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
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

    const project = validateProject(await readJsonBody(request));
    const projects = await readProjects();
    projects.unshift(project);
    await writeProjects(projects);
    sendJson(response, 201, project);
    return;
  }

  sendJson(response, 404, { error: "API route not found." });
}

async function serveStatic(pathname, response) {
  const cleanPath = pathname === "/" ? "/HTML/index.html" : decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(ROOT_DIR, cleanPath));

  if (!filePath.startsWith(ROOT_DIR)) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, { "Content-Type": contentTypes[extension] || "application/octet-stream" });
    response.end(file);
  } catch {
    sendText(response, 404, "Page not found");
  }
}

async function readProjects() {
  const file = await fs.readFile(PROJECTS_FILE, "utf8");
  return JSON.parse(file);
}

async function writeProjects(projects) {
  await fs.mkdir(path.dirname(PROJECTS_FILE), { recursive: true });
  await fs.writeFile(PROJECTS_FILE, `${JSON.stringify(projects, null, 2)}\n`);
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function validateProject(input) {
  const title = cleanText(input.title);
  const description = cleanText(input.description);

  if (!title || !description) {
    const error = new Error("Project title and description are required.");
    error.statusCode = 400;
    throw error;
  }

  return {
    id: slugify(title),
    title,
    description,
    imageUrl: cleanText(input.imageUrl) || "https://placehold.co/600x400",
    projectUrl: cleanText(input.projectUrl) || "#",
    tags: cleanText(input.tags)
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    featured: Boolean(input.featured),
    createdAt: new Date().toISOString()
  };
}

function cleanText(value) {
  return String(value || "").trim();
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
  return true;
}

function getSessionToken(request) {
  const cookieHeader = request.headers.cookie || "";
  const match = cookieHeader.match(/(?:^|;\s*)portfolio_session=([^;]+)/);
  return match ? match[1] : "";
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(text);
}
