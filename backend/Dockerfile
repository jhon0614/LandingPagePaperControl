FROM node:24-bookworm-slim

WORKDIR /app

# Instala las versiones del lockfile, sin dependencias de desarrollo.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Incluye la API y el script para crear el administrador.
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts

# Ejecuta la aplicación sin permisos de administrador.
USER node

EXPOSE 3000

CMD ["node", "src/server.js"]