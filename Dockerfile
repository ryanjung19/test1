FROM node:24.20.0-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json ./
RUN npm install --no-audit --no-fund

FROM deps AS builder
COPY . .
RUN npm run build

FROM node:24.20.0-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

FROM deps AS dbtools
COPY drizzle.config.ts tsconfig.json ./
COPY src/db ./src/db
COPY db ./db
COPY scripts/nas-db-init.mjs ./scripts/nas-db-init.mjs
CMD ["npm", "run", "db:init:nas"]
