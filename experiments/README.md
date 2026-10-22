# FitLife — Course Experiments

Each folder is one experiment from the Web and Mobile Application Development course, built around the FitLife website in the parent folder.

| No. | Experiment | Folder | How to run | Open |
|----|-----------|--------|-----------|------|
| 1 | Home page | `../index.html` | Open the file in a browser | — |
| 2 | Signup and login page | `02-auth/` | Open `index.html` in a browser | — |
| 3 | Form validation | `02-auth/` | Same page as experiment 2 | — |
| 4 | Parse the webpage using jQuery and DOM | `04-jquery/` | Open `index.html` (needs internet for jQuery) | — |
| 5 | Web server using Node.js | `05-node-server/` | `npm start` | http://localhost:3000 |
| 6 | Three-tier app with Node.js and MySQL | `06-three-tier/` | `npm install`, then `npm start` | http://localhost:3100 |
| 7 | Angular reactive form for registration | `07-08-angular/` | `npm install`, then `npm start` | http://localhost:4200/register |
| 8 | Angular routing and navigation | `07-08-angular/` | Same app as experiment 7 | http://localhost:4200 |
| 9 | Creation of microservices | `09-10-microservices/` | `npm start` | http://localhost:4000 |
| 10 | Deployment of microservices | `09-10-microservices/` | `npm start` (or `docker compose up --build`) | http://localhost:4000/status.html |

## Requirements

- Node.js 18 or newer (tested with Node.js 24)
- Experiment 6: by default `npm start` downloads and starts a temporary MySQL 8.4 server with `mysql-memory-server`, so nothing else is needed. To use your own MySQL server instead, set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME` (create the tables with `db/schema.sql`).
- Experiment 10 (optional): Docker Desktop, for `docker compose up --build`.

## Ports

| Port | Used by |
|------|---------|
| 3000 | Node.js web server (experiment 5) |
| 3100 | Three-tier Express API and page (experiment 6) |
| 4200 | Angular development server (experiments 7 and 8) |
| 4000 | API gateway (experiments 9 and 10) |
| 4001–4003 | user-service, workout-service, stats-service |
