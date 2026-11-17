# syntax=docker/dockerfile:1
# The casino in a container: nginx serves it at /casino/. The site's front
# door (BalatroPortal's nginx) passes /casino/ here; BalatroFrontEnd's
# docker-compose.yml runs it with the rest.
#
#   docker build --network host -t balatro-casino .
#   docker run -p 8088:80 balatro-casino      # http://localhost:8088/casino/ (without the services)

FROM node:22-trixie-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
# other origins for the services or the portal (by default all on this one)
ARG VITE_ITEMS_URL=""
ARG VITE_SOCIAL_URL=""
ARG VITE_IDENTITY_URL=""
ARG VITE_PORTAL_URL=""
ARG VITE_GAME_URL=""
RUN npm run build

FROM nginx:1.28-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html/casino
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1/casino/"]
