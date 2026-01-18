# KFZ Handelsplattform - Backend API

Backend API für die KFZ Handelsplattform.

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **File Upload:** Multer
- **Port:** 3000

## Quick Start

```bash
# Repository klonen
git clone https://github.com/alperkagan67/kfz-backend.git
cd kfz-backend

# Dependencies installieren
npm install

# Server starten
npm start
```

Server läuft auf: http://localhost:3000

## API Endpoints

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/api/vehicles` | Alle Fahrzeuge abrufen |
| POST | `/api/vehicles` | Neues Fahrzeug erstellen |
| POST | `/api/inquiries` | Kundenanfrage senden |

## Projektstruktur

```
backend/
├── server.js        # Express Server & Routes
├── package.json     # Dependencies
└── README.md        # Diese Datei
```

## Entwicklung

```bash
# Mit Auto-Reload (nodemon)
npm run dev
```

## Jira Board

Tickets: https://alperkagan.atlassian.net/browse/KAN

## Verwandte Repos

- **Frontend:** https://github.com/alperkagan67/kfz-frontend
