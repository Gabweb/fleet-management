FROM node:22-alpine

RUN apk add --no-cache git
RUN mkdir -p /app
RUN chown node:node -R /app/
USER node
RUN mkdir -p /app/backend && mkdir -p /app/frontend/src/pages/plugin && mkdir /app/plugins

WORKDIR /app
RUN npm install typescript
RUN ls -la ./
COPY ./.VERSION /app/

## backend
WORKDIR /app/backend
COPY ./backend /app/backend
COPY ./npmrc/.npmrc /app/backend/.npmrc
RUN npm install && /app/node_modules/typescript/bin/tsc --build --force
RUN rm /app/backend/.npmrc
## backend END

## frontend
WORKDIR /app/frontend
COPY ./frontend /app/frontend
RUN npm install --legacy-peer-deps && npm run build

WORKDIR /app/backend
ENV NODE_PATH=/app/backend/

ENTRYPOINT "node" "dist/app.js"
