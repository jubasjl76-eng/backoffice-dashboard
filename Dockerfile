# Staff / breeder web console — build with Vite, serve with nginx.
# nginx also proxies /api → the backend so the SPA has one origin in dev.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# API base is same-origin (/api is proxied by nginx below)
ENV VITE_API_BASE_URL=/api
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
