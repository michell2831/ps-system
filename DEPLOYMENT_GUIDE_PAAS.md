# 🌐 PaaS Cloud Deployment Guide (Free / Low-Cost)
## Para sa PSS (Frontend + Microservices) at ICSA Chatbot

Gabay ito para sa pag-deploy ng **Planning Standards System (PSS)** at **ICSA Chatbot** gamit ang **Vercel** (Frontend) at **Railway / Render** (Backend & Databases).

---

## 🏗️ Architecture Overview

```
[ User Browser ]
       │
       ├────────────────────────► [ Vercel ] (React Frontend SPA)
       │                                │
       │ (REST API /api/*)              │ (REST API /api/v1/*)
       ▼                                ▼
[ Railway / Render ]             [ Railway / Render ]
  - pss-api-gateway (Port 4003)    - icsa-api (FastAPI, Port 8000)
  - Microservices (3010-3013)      - pgvector DB
  - PostgreSQL Databases           - ClickHouse DB
```

---

## 🚀 Part 1: I-deploy ang Frontend sa VERCEL (Libre & Mabilis)

1. Pumunta sa [Vercel](https://vercel.com) at mag-log in gamit ang inyong **GitHub account**.
2. I-click ang **"Add New..."** ➔ **"Project"**.
3. Piliin ang inyong repository: `StephanieNiccoleCalawod/Planning-Standards-System` (Branch: `V1.0-Sprint-5`).
4. Sa **Configure Project** settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Sa **Environment Variables**, idagdag:
   - `VITE_API_URL` = `https://<iyong-backend-gateway-url>/api` *(I-update kapag live na ang backend)*
   - `VITE_ICSA_API_URL` = `https://<iyong-icsa-api-url>/api/v1`
6. I-click ang **"Deploy"**.
7. Pagkatapos ng ~1 minuto, magbibigay ang Vercel ng live URL (hal. `https://planning-standards-system.vercel.app`).

> 💡 **Tandaan:** Naka-configure na ang [vercel.json](file:///d:/Capstone/Sprint%204/Planning-Standards-System-sprint-5-BE-DEV-2/vercel.json) para sa smooth client-side routing ng React SPA.

---

## ⚙️ Part 2: I-deploy ang Backend Microservices & Databases

Dahil binubuo ang PSS ng **API Gateway, 4 na NestJS Microservices, at PostgreSQL**, ang pinakamadaling paraan para patakbuhin ang buong Docker architecture ay:

### Option A: RAILWAY (Inirerekomenda para sa Multi-Container)

1. Pumunta sa [Railway.app](https://railway.app) at mag-login gamit ang GitHub.
2. I-click ang **"New Project"** ➔ **"Deploy from GitHub repo"**.
3. Piliin ang repository: `Planning-Standards-System`.
4. Sa loob ng Railway project:
   - Mag-add ng **PostgreSQL** plugins para sa:
     - `pss-postgres-catalogue`
     - `pss-postgres-kpi-sla`
     - `pss-postgres-commitment`
   - I-deploy ang microservices:
     - `service-catalogue` (Root: `planning-standards-system/src/modules/service-catalogue`)
     - `kpi-sla` (Root: `planning-standards-system/src/modules/kpi-sla`)
     - `commitment` (Root: `planning-standards-system/src/modules/commitment`)
     - `planning` (Root: `planning-standards-system/src/modules/planning`)
     - `api-gateway` (Root: `planning-standards-system/src/modules/api-gateway`)
5. I-generate ang **Public Domain** para sa `api-gateway` (ito ang ilalagay sa `VITE_API_URL` ng Vercel).

---

### Option B: RENDER (render.com)

1. Pumunta sa [Render Dashboard](https://dashboard.render.com).
2. **PostgreSQL Database**:
   - Mag-create ng **New PostgreSQL** instance.
3. **Web Service (API Gateway & Backend)**:
   - I-click ang **New ➔ Web Service**.
   - Ikonekta ang inyong GitHub repo.
   - Piliin ang **Docker** environment.
   - I-set ang Environment Variables (Database URLs, JWT Secrets, at ARMS URL).
4. Kopyahin ang binigay na Render service URL (hal. `https://pss-api-gateway.onrender.com`).

---

## 🤖 Part 3: I-deploy ang ICSA AI Chatbot

1. Sa **Railway** o **Render**, mag-create ng bagong Web Service mula sa folder na `PSS-Intelligent-Citizen-Service-Assistant-ICSA--5`.
2. I-set ang sumusunod na **Environment Variables**:
   ```env
   GROQ_API_KEY=gsk_your_groq_api_key_here
   GROQ_MODEL=llama-3.1-8b-instant
   PGVECTOR_URL=postgresql://<user>:<pass>@<pgvector-host>:5432/<dbname>
   CLICKHOUSE_HOST=<clickhouse-host>
   CLICKHOUSE_PASSWORD=icsa123
   ALLOWED_ORIGINS=https://planning-standards-system.vercel.app
   ```
3. Kunin ang live URL ng ICSA (hal. `https://icsa-api.onrender.com`).

---

## 🔗 Part 4: I-link ang Frontend sa Live Backend

1. Bumalik sa inyong **Vercel Project Dashboard**.
2. Pumunta sa **Settings ➔ Environment Variables**.
3. I-update ang mga variables gamit ang totoong live URLs:
   - `VITE_API_URL` = `https://<iyong-railway-api-gateway-url>/api`
   - `VITE_ICSA_API_URL` = `https://<iyong-railway-icsa-url>/api/v1`
4. I-click ang **"Redeploy"** sa Vercel.

---

## ✅ Verification Checklist

- [ ] Nabubuksan ang Vercel frontend URL sa mobile at desktop.
- [ ] Nakakapag-login gamit ang iba't ibang roles (Admin, Staff, Planning Officer, etc.).
- [ ] Naglo-load ang mga serbisyo sa Service Catalogue at KPI Standards.
- [ ] Gumagana ang ICSA floating button at nakakasagot ang AI gamit ang Citizen's Charter context.
