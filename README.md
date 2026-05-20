# Millie McVey Portfolio

Portfolio site with a small Node backend for adding project cards from a private admin area.

## Run Locally

```powershell
$env:ADMIN_USERNAME="millie"
$env:ADMIN_PASSWORD="choose-a-strong-password"
npm start
```

Open:

- Public site: `http://localhost:3000`
- Admin login: `http://localhost:3000/HTML/login.html`

If you do not set environment variables, the default login is:

- Username: `millie`
- Password: `change-this-password`

Change that before deploying.

## How It Works

- Public project cards are loaded from `GET /api/projects`.
- Login uses `POST /api/login` and a short-lived HTTP-only cookie.
- New projects are saved to `data/projects.json`.
- The admin form is at `HTML/admin.html`.

This is intentionally dependency-free so it can run anywhere Node is available.
