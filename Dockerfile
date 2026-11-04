# Imagen de la Calculadora de Huella de Carbono
# compilar la interfaz 
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci

COPY shared shared
COPY client client
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3001 \
    SERVE_CLIENT=true
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
# dependencias de servidor y compartidas
RUN npm ci --omit=dev -w server -w shared && npm cache clean --force
COPY --chown=node:node shared shared
COPY --chown=node:node server server
COPY --chown=node:node --from=build /app/client/dist client/dist

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:' + process.env.PORT + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server/src/index.js"]
