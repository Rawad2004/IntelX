# IntelX — Contexto del Proyecto

## Descripción general

IntelX es una plataforma de inteligencia deportiva impulsada por IA, centrada inicialmente en fútbol, construida sobre Web3.  
No es una plataforma de apuestas. Es un motor de análisis estadístico que procesa:

- Rendimiento histórico de equipos
- xG/xGA (expected goals / expected goals against)
- Momentum y tempo del partido
- Patrones repetitivos (timing de gol, corners, tarjetas, etc.)
- Capas de IA para scoring y consenso

El token $INX es puramente de utilidad y otorga:

- Acceso a niveles avanzados de analítica
- Descuentos en módulos de IA
- Acceso anticipado a dashboards y features
- Beneficios de comunidad
- Participación no formal en dirección de producto

No hay promesas de retornos financieros ni funciones de betting.

---

## Tech stack del monorepo

- `/server`: NestJS (API, presale, futura integración con modelos de datos)
- `/client`: Next.js 14 (App Router) + Tailwind CSS (landing + futura app de usuario)
- Objetivo: Monorepo organizado, escalable, listo para:
  - Landing de presale
  - API de registro de interesados / whitelist
  - Más adelante, dashboard de analítica y simuladores

---

## Objetivo actual

Construir una **landing de presale** dentro de `/client` con Next.js + Tailwind, inspirada visualmente en:

- https://brighthub.casethemes.net/blockchain-web3-saas/

Esta landing será la primera capa pública del proyecto y debe verse moderna, Web3, SaaS, con estética de producto premium de datos/IA.

---

## Secciones mínimas de la landing

1. **Hero Section**
   - Logo IntelX
   - Título principal: “AI-Powered Sports Intelligence”
   - Frase fuerte secundaria (tagline)
   - CTA: “Join Discord” y “Join Telegram”
   - Una pequeña tarjeta o bloque que mencione “Presale coming soon” y datos básicos (soft cap, hard cap).

2. **What is IntelX**
   - Explicación corta de qué es IntelX
   - Enfasis en:
     - Analytics, IA, momentum, xG/xGA, patrones repetitivos
     - No es betting, no hay señales ni promesas de retorno

3. **Why IntelX is different**
   - Bullets tipo:
     - Multi-layer AI modeling
     - Real sports science
     - Utility-first token
     - Regulatory-first design
   - Mostrar por qué no es “otra app de picks”.

4. **Token $INX**
   - Descripción de utilidad del token:
     - Acceso a tiers de analítica
     - Descuentos en módulos
     - Beta features
     - Community roles
     - Burn engine
   - Resumen de tokenomics:
     - Supply: 1,000,000,000 INX
     - Presale: 10%
     - Liquidity: 30%
     - Ecosystem & Development: 20%
     - Marketing & Growth: 15%
     - Treasury: 15%
     - Team: 10% (con vesting)

5. **Roadmap (resumen)**
   - Q4 2025 — Ecosystem Setup
   - Q1 2026 — Presale + Dashboard V1 + Scenario Simulator V1
   - Q2 2026 — Dashboard V2 + AI Phase 2 + Burn Engine V1
   - Q3 2026 — Optimización + Multisport
   - Q4 2026 — Dashboard V3 + Scenario Simulator V2 + Burn Engine V2

6. **Screenshots / Mockups**
   - Placeholders de:
     - Dashboard de analítica (momentum, xG, stats)
     - Scenario simulator
   - No hace falta que sean reales todavía, pueden ser imágenes estáticas o cajas estilizadas.

7. **Team**
   - Por ahora:
     - “Founder — 5+ years analytics & modeling experience”
   - Texto corto sobre background en datos, modelos y producto digital.

8. **Social & Links**
   - Botones / links a:
     - Discord
     - Telegram
     - X (Twitter)
     - GitHub
     - Whitepaper
   - Footer con disclaimer legal:
     - “IntelX does not provide betting services or financial advice. $INX is a pure utility token.”

---

## Estilo visual deseado

- Layout tipo SaaS / Web3 moderno
- Paleta: tonos oscuros (slate/neutral) + acentos cian/verde/emerald
- Gradientes suaves, “glow”, toque futurista
- Tipografía sans moderna (Inter / Poppins / similar)
- Bordes redondeados, tarjetas glassmorphism ligero
- Responsivo: mobile-first, se debe ver bien en móviles y desktop
- Animaciones leves: hover, fades, pequeños movimientos en mockups (más adelante)

---

## Objetivo de arquitectura en el frontend (`/client`)

- Usar Next.js App Router
- Organizar las secciones como componentes reutilizables en `/client/components`
- Evitar spaghetti en `page.tsx`
- Preparar el proyecto para que más adelante:
  - Se pueda añadir un panel de login / conexión de wallet
  - Se pueda consumir una API desde `/server` (NestJS) para registro de leads o whitelist

---

## Objetivo posterior en el backend (`/server`)

Más adelante, crear:

- Módulo `presale` en NestJS
  - Endpoint `POST /presale/register` para guardar:
    - email (opcional)
    - walletAddress
    - source (ej: "landing", "discord", "telegram")
- Al principio se puede guardar en memoria o en una estructura simple
- Luego se conectará a base de datos

---

## Nota para el asistente de código (Codex / ChatGPT en VSCode)

Cuando te pida generar código:

- Usa este archivo como contexto para entender qué es IntelX y cómo debe verse la landing.
- Respeta la estructura de carpetas:
  - `/client` para NextJS
  - `/server` para NestJS
- Genera componentes limpios, bien nombrados, que representen cada sección descrita.
- Evita lógica innecesaria por ahora: foco en el layout y los textos base.
