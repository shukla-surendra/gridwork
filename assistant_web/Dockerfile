# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve stage -- same nginx-serves-a-static-directory model as ../assistant_web,
# just pointed at Next's static-export output (`out/`) instead of CRA's `build/`.
FROM nginx:1.27-alpine
COPY --from=build /app/out /usr/share/nginx/html
# nginx's own entrypoint runs envsubst on *.template files here at container
# start, writing the result to /etc/nginx/conf.d/ -- lets BACKEND_HOST/PORT
# vary per environment (docker-compose vs. Helm) without rebuilding the image.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV BACKEND_HOST=backend
ENV BACKEND_PORT=8000
EXPOSE 80
