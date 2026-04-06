# Etapa 1: Buildeo
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN cp -r db dist/db

# Etapa 2: Production
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder --chown=node:node /app/dist ./dist

# Ejecutar la app sin privilegios de root
USER node

# Puertos
EXPOSE 3001
ENV PORT=3001

# Comando para iniciar la aplicación
CMD ["node", "dist/src/main.js"]