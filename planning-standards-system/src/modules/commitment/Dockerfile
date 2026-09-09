FROM node:20-alpine

WORKDIR /app

COPY src/common/package*.json src/common/
COPY src/modules/commitment/package*.json src/modules/commitment/
COPY src/modules/commitment/tsconfig.json src/modules/commitment/

WORKDIR /app/src/common
RUN npm install

WORKDIR /app/src/modules/commitment
RUN npm install

COPY src/common src/common
COPY src/modules/commitment src/modules/commitment

WORKDIR /app/src/modules/commitment
RUN npm run build

EXPOSE 3002
CMD ["node", "dist/modules/commitment/src/modules/commitment/main.js"]
