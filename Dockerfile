FROM node:24.20.0-bookworm-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN timeout 10m npm ci --no-audit --no-fund --loglevel=verbose \
    --fetch-retries=2 --fetch-retry-maxtimeout=30000 --fetch-timeout=60000

FROM deps AS builder
COPY . .
RUN npm run build

FROM node:24.20.0-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    VASSMENT_RUN_AS=nextjs
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY scripts/container-entrypoint.sh /usr/local/bin/vassment-entrypoint
RUN chmod 0755 /usr/local/bin/vassment-entrypoint \
    && apt-get update \
    && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/local/bin/vassment-entrypoint"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

FROM deps AS dbtools
COPY --chown=node:node drizzle.config.ts tsconfig.json ./
COPY --chown=node:node src/db ./src/db
COPY --chown=node:node db ./db
COPY --chown=node:node scripts/nas-db-init.mjs ./scripts/nas-db-init.mjs
COPY scripts/container-entrypoint.sh /usr/local/bin/vassment-entrypoint
ENV VASSMENT_RUN_AS=node
RUN chown node:node /app \
    && chmod 0755 /usr/local/bin/vassment-entrypoint \
    && apt-get update \
    && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/local/bin/vassment-entrypoint"]
CMD ["npm", "run", "db:init:nas"]
