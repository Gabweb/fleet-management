FROM node:alpine
RUN mkdir /app/
RUN mkdir -p /app/backend/dist && mkdir -p /app/backend/plugins && mkdir -p /app/frontend/src/pages/plugin
WORKDIR /app
COPY ./.VERSION /app/

## backend
WORKDIR /app/backend
COPY ./backend/db /app/backend/db
COPY ./backend/cfg /app/backend/cfg
COPY ./backend/dist /app/backend/dist
COPY ./backend/node_modules /app/backend/node_modules
## backend END

## frontend
WORKDIR /app/frontend
COPY ./frontend /app/frontend

WORKDIR /app/backend
RUN chown node:node -R /app/
RUN chmod 0770 -R /app/
ENV NODE_PATH=/app/backend/
USER node

ENTRYPOINT "node" "dist/app.js"
