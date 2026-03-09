# ==============================================================================
# SMC-Office - Production Dockerfile V4.8.7
# Infisical CLI + Prisma Migrate Deploy
# GitHub Actions CI/CD + Bug-Fix Referenz-Kunden Zähllogik
# ==============================================================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Yarn Berry aktivieren
RUN corepack enable && corepack prepare yarn@4.1.0 --activate

# Package-Dateien UND yarn.lock kopieren (KRITISCH für --immutable!)
COPY package.json yarn.lock .yarnrc.yml ./

# Dependencies installieren (immutable = yarn.lock muss existieren)
RUN yarn install --immutable

# Stage 2: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare yarn@4.1.0 --activate

# Dependencies aus deps-Stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma Client generieren (Schema-Validierung)
RUN yarn prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# KRITISCH: Standalone-Output aktivieren (erstellt server.js!)
ENV NEXT_OUTPUT_MODE=standalone

# Next.js Standalone Build
RUN yarn build

# Verify standalone build was successful (outputFileTracingRoot creates nextjs_space subdir)
RUN test -f .next/standalone/nextjs_space/server.js || (echo "ERROR: Standalone build failed - server.js not found in .next/standalone/nextjs_space/!" && exit 1)

# Stage 3: Runner (Production)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# ==============================================================================
# INFISICAL CLI Installation
# ==============================================================================
RUN apk add --no-cache curl bash ca-certificates \
    && curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh' | bash \
    && apk add --no-cache infisical

# Non-root User
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Standalone-Output kopieren
# WICHTIG: outputFileTracingRoot erstellt Unterverzeichnis 'nextjs_space'
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone/nextjs_space ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma-Engines für Runtime (migrate deploy)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/prisma ./prisma

# Entrypoint-Script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Uploads-Verzeichnis
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# ==============================================================================
# STARTBEFEHL: Infisical injiziert Secrets -> Prisma Migrate -> Node Server
# ==============================================================================
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
