# syntax=docker/dockerfile:1.6
ARG NODE_VERSION=20.17.0
ARG NGINX_VERSION=1.27-alpine
ARG VITE_API_BASE_URL=https://api.example.com

FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:${NGINX_VERSION} AS runner
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
