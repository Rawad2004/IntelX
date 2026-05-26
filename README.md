# IntelX

> Behavioral Football Intelligence — understanding how matches behave, not predicting their result.

IntelX is an analytical engine that reads the dynamics of a football match — pressure, momentum, tactical patterns — and translates them into a clear, honest, and actionable language. **No predictions, no betting, no false certainty.**

## Project structure

This is a monorepo with two applications:

```
.
├── client/     Next.js 16 (App Router) + Tailwind v4 — landing & app
├── server/     NestJS 11 — API, behavioral engine, integrations
└── docs/       Project documentation & conceptual material
```

## Stack

**Frontend (`client/`):**
- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS v4
- TypeScript 5

**Backend (`server/`):**
- NestJS 11
- TypeORM + MySQL
- JWT + Passport (auth)
- Swagger (auto-generated docs)
- Resend / Nodemailer (transactional email)
- Class-validator + Zod

## Local development

```bash
# Frontend
cd client && npm install && npm run dev        # http://localhost:3000

# Backend
cd server && npm install && npm run start:dev  # http://localhost:3001
# Swagger docs: http://localhost:3001/api/docs
```

## Branching strategy

This repo follows a simplified GitFlow:

- `main` — production-ready code
- `develop` — integration branch for upcoming releases
- `feature/<name>` — feature branches, branched from `develop`, merged back via `--no-ff`

## Philosophy

IntelX explicitly does **not**:

- Predict scores or match results
- Recommend bets, markets, or strategies
- Reference odds, prices, or probabilities
- Optimize for win rates

It explains **how** matches behave — and tells you when it's confident, and when it isn't.

---

© IntelX — All rights reserved.
