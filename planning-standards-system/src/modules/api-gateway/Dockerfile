FROM node:20-alpine

WORKDIR /app

COPY src/common/package*.json src/common/
COPY src/modules/api-gateway/package*.json src/modules/api-gateway/
COPY src/modules/api-gateway/tsconfig.json src/modules/api-gateway/

WORKDIR /app/src/common
RUN npm install

WORKDIR /app/src/modules/api-gateway
RUN npm install

COPY src/common src/common
COPY src/modules/api-gateway src/modules/api-gateway

WORKDIR /app/src/modules/api-gateway
RUN npm run build

EXPOSE 4003
CMD ["node", "dist/modules/api-gateway/src/modules/api-gateway/main.js"]
