# Primera etapa: compila la aplicación.
FROM node:24-bookworm-slim AS development

WORKDIR /app

# La compilación necesita también las dependencias de desarrollo.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "80", "--strictPort"]

FROM development AS build

# Vite incorpora estos valores al compilar el frontend.
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_RECAPTCHA_SITE_KEY

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_RECAPTCHA_SITE_KEY=${VITE_RECAPTCHA_SITE_KEY}

RUN npm run build

# Segunda etapa: sirve únicamente los archivos compilados.
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80