# Conference site — single-stage, no build step needed.
FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

# Dependencies first so Docker can cache them.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

# Registrations live here. Mount a volume so they survive redeploys:
#   docker run -v conference-data:/app/data ...
ENV DATA_DIR=/app/data
RUN mkdir -p /app/data && chown -R node:node /app/data
VOLUME ["/app/data"]

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=4s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
