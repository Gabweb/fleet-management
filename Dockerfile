FROM node:22-alpine

RUN apk add --no-cache git
RUN mkdir -p /app
RUN chown node:node -R /app/
USER node
RUN mkdir -p /app/backend && mkdir -p /app/frontend/src/pages/plugin && mkdir /app/plugins

WORKDIR /app
RUN npm install typescript
RUN ls -la ./

## backend
WORKDIR /app/backend
COPY ./backend /app/backend
ARG BACKEND_NPMRC=""
RUN if [ -n "$BACKEND_NPMRC" ]; then printf "%s" "$BACKEND_NPMRC" > /app/backend/.npmrc; fi \
    && npm install \
    && /app/node_modules/typescript/bin/tsc --build --force \
    && rm -f /app/backend/.npmrc
## backend END

## frontend
WORKDIR /app/frontend
COPY ./frontend /app/frontend
RUN npm install --legacy-peer-deps && npm run build

WORKDIR /app/backend
ENV NODE_PATH=/app/backend/

ENTRYPOINT "node" "dist/app.js"
