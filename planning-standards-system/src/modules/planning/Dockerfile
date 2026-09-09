FROM node:20-alpine

WORKDIR /app

COPY src/common/package*.json src/common/
COPY src/modules/planning/package*.json src/modules/planning/
COPY src/modules/planning/tsconfig.json src/modules/planning/

WORKDIR /app/src/common
RUN npm install

WORKDIR /app/src/modules/planning
RUN npm install

COPY src/common src/common
COPY src/modules/planning src/modules/planning

WORKDIR /app/src/modules/planning
RUN npm run build

EXPOSE 4005
CMD ["node", "dist/modules/planning/src/modules/planning/main.js"]
