FROM node:20-alpine

WORKDIR /app

COPY src/common/package*.json src/common/
COPY src/modules/service-catalogue/package*.json src/modules/service-catalogue/
COPY src/modules/service-catalogue/tsconfig.json src/modules/service-catalogue/

WORKDIR /app/src/common
RUN npm install

WORKDIR /app/src/modules/service-catalogue
RUN npm install

COPY src/common src/common
COPY src/modules/service-catalogue src/modules/service-catalogue

WORKDIR /app/src/modules/service-catalogue
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/modules/service-catalogue/src/modules/service-catalogue/main.js"]
