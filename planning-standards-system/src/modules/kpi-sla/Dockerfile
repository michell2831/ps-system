FROM node:20-alpine

WORKDIR /app

COPY src/common/package*.json src/common/
COPY src/modules/kpi-sla/package*.json src/modules/kpi-sla/
COPY src/modules/kpi-sla/tsconfig.json src/modules/kpi-sla/

WORKDIR /app/src/common
RUN npm install

WORKDIR /app/src/modules/kpi-sla
RUN npm install

COPY src/common src/common
COPY src/modules/kpi-sla src/modules/kpi-sla

WORKDIR /app/src/modules/kpi-sla
RUN npm run build

EXPOSE 3001
CMD ["node", "dist/modules/kpi-sla/src/modules/kpi-sla/main.js"]
