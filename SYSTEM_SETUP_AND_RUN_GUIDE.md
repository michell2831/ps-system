# 🚀 Comprehensive System Startup & Setup Guide
## Planning and Standards System (PSS) & Intelligent Citizen Service Assistant (ICSA)

Gabay ito para sa **fresh / bagong setup** ng buong system (Frontend, Microservices Backend, Database, at ICSA AI Assistant).

---

## 📋 Table of Contents
1. [Mga Kinakailangan (Prerequisites)](#1-mga-kinakailangan-prerequisites)
2. [Port Reference Table](#2-port-reference-table)
3. [Hakbang sa Pagpapatakbo (Step-by-Step Guide)](#3-hakbang-sa-pagpapatakbo-step-by-step-guide)
   - [A. Environment Configuration (.env)](#a-environment-configuration-env)
   - [B. Patakbuhin ang PSS Backend & Microservices](#b-patakbuhin-ang-pss-backend--microservices)
   - [C. Patakbuhin ang ICSA AI Assistant](#c-patakbuhin-ang-icsa-ai-assistant)
   - [D. Patakbuhin ang PSS Frontend](#d-patakbuhin-ang-pss-frontend)
4. [Paano I-verify kung Gumagana ang Lahat](#4-paano-i-verify-kung-gumagana-ang-lahat)
5. [Mga Karaniwang Error at Solusyon (Troubleshooting)](#5-mga-karaniwang-error-at-solusyon-troubleshooting)

---

## 1. Mga Kinakailangan (Prerequisites)

Bago simulan, siguraduhing naka-install ang mga sumusunod sa inyong makina:
- **Docker Desktop** (Dapat ay bukas at tumatakbo ang Docker engine)
- **Node.js** (v18 o v20 LTS) at **npm** / **pnpm**
- **Git**

---

## 2. Port Reference Table

| Service | Port | Description |
| :--- | :--- | :--- |
| **PSS Frontend** | `5174` (o `5175`) | React + Vite Main Web Application |
| **PSS API Gateway** | `4003` | Central Gateway for PSS Microservices |
| **Service Catalogue Service** | `3010` (Internal: `4000`) | Service Catalogue & Service Modes API |
| **KPI & SLA Service** | `3011` (Internal: `4001`) | KPI Standards, Holidays, SLA, Periods API |
| **Commitment Service** | `3012` (Internal: `4002`) | OPCR Commitments API |
| **Planning Service** | `3013` (Internal: `4005`) | Planning Hub & Timeline API |
| **ICSA API (FastAPI)** | `8000` | RAG Chatbot Backend (Groq/Llama 3.1) |
| **ICSA pgvector DB** | `5434` | Vector Database para sa Citizen's Charter |
| **ICSA ClickHouse** | `8123` / `9000` | Analytics and Query Logging |
| **ICSA Standalone Frontend** | `5176` | (Optional) Hiwalay na Chat UI |

---

## 3. Hakbang sa Pagpapatakbo (Step-by-Step Guide)

### A. Environment Configuration (.env)

#### 1. PSS Frontend `.env`
Pumunta sa folder ng frontend at siguraduhing may `.env` file:
```powershell
cd "d:\Capstone\Sprint 4\Planning-Standards-System-sprint-5-BE-DEV-2"
```
Nilalaman ng `.env`:
```env
VITE_API_URL=http://localhost:4003/api
VITE_ICSA_API_URL=http://localhost:8000/api/v1
```

#### 2. ICSA `.env`
Pumunta sa folder ng ICSA at siguraduhing may `.env` file:
```powershell
cd "d:\Capstone\Sprint 4\PSS-Intelligent-Citizen-Service-Assistant-ICSA--5"
```
*(Kung wala pa, kopyahin mula sa `.env.example`: `cp .env.example .env`)*
Siguraduhing nakalagay ang inyong **Groq API Key**:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
PGVECTOR_URL=postgresql://postgres:postgres@localhost:5434/postgres
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=icsa123
```

---

### B. Patakbuhin ang PSS Backend & Microservices

1. Buksan ang Terminal / PowerShell sa PSS Backend directory:
```powershell
cd "d:\Capstone\Sprint 4\Planning-Standards-System-sprint-5-BE-DEV-2\planning-standards-system"
```

2. I-build at patakbuhin ang mga Docker container:
```powershell
docker compose up -d --build
```

> 💡 **Tandaan:** Awtomatikong magse-seed ang database ng mga default offices, services, evaluation periods, at holidays sa unang pagtakbo.

---

### C. Patakbuhin ang ICSA AI Assistant

1. Buksan ang panibagong Terminal / PowerShell sa ICSA directory:
```powershell
cd "d:\Capstone\Sprint 4\PSS-Intelligent-Citizen-Service-Assistant-ICSA--5"
```

2. Patakbuhin ang mga ICSA Docker containers:
```powershell
docker compose up -d --build
```

3. *(Optional / First-time Indexing)* Kung kailangang i-re-embed ang mga serbisyo sa vector database:
```powershell
docker exec -it icsa-api python scripts/run_embedding.py
```

---

### D. Patakbuhin ang PSS Frontend

1. Buksan ang Terminal / PowerShell sa frontend root directory:
```powershell
cd "d:\Capstone\Sprint 4\Planning-Standards-System-sprint-5-BE-DEV-2"
```

2. I-install ang dependencies (kung bagong clone):
```powershell
npm install
```

3. Patakbuhin ang development server:
```powershell
npm run dev
```

4. Buksan ang browser at pumunta sa:
👉 **`http://localhost:5174/`**

---

## 4. Paano I-verify kung Gumagana ang Lahat

1. **PSS Microservices Health**:
   - Mag-login sa PSS (`http://localhost:5174/`).
   - Pumunta sa **Service Catalogue**, **KPI Standards**, at **Evaluation Periods** upang kumpirmahing naglo-load ang data mula sa backend.
2. **ICSA Floating Chatbot**:
   - I-click ang **ICSA Floating Avatar** sa ibabang-kanang sulok ng screen (bottom-right).
   - Magpadala ng tanong (hal. *"Ano ang mga requirements para sa Transcript of Records?"* o *"Paano kumuha ng Certificate of Registration?"*).
   - Dapat magbalik si ICSA ng maayos at magalang na sagot mula sa Citizen's Charter.

---

## 5. Mga Karaniwang Error at Solusyon (Troubleshooting)

### Q1: Connection Error / "Unable to establish connection to backend database"
- **Dahilan:** Hindi pa tapos mag-start o hindi tumatakbo ang PSS Docker containers.
- **Solusyon:** 
  ```powershell
  cd "d:\Capstone\Sprint 4\Planning-Standards-System-sprint-5-BE-DEV-2\planning-standards-system"
  docker compose ps
  docker compose up -d
  ```

### Q2: 403 "Insufficient permissions" sa Staff Account
- **Dahilan:** Lumang backend image na walang read permissions para sa `Role.STAFF`.
- **Solusyon:** I-rebuild ang microservices:
  ```powershell
  docker compose up -d --build kpi-sla service-catalogue commitment planning
  ```

### Q3: Hindi sumasagot si ICSA / "Failed to fetch response"
- **Dahilan:** Walang valid na `GROQ_API_KEY` o hindi tumatakbo ang `icsa-api` container.
- **Solusyon:**
  1. Tingnan ang `.env` sa ICSA folder kung may valid `GROQ_API_KEY`.
  2. Tingnan ang logs ng ICSA API:
     ```powershell
     docker logs -f icsa-api
     ```

### Q4: Port Conflict sa PostgreSQL (Port 5432 o 5433)
- **Solusyon:** Naka-configure na ang ating `docker-compose.yml` upang gumamit ng non-conflicting host ports:
  - `5442` para sa PSS Catalogue DB
  - `5443` para sa PSS KPI/SLA DB
  - `5444` para sa PSS Commitment DB
  - `5434` para sa ICSA pgvector DB
