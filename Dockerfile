# Stage 1: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Yarn Setup
RUN corepack enable && corepack prepare yarn@4.1.0 --activate
COPY . .
RUN yarn install --no-immutable

# ZWANGS-KONFIGURATION für Standalone-Modus
# Wir überschreiben die next.config, um sicherzugehen, dass standalone aktiv ist
RUN echo "module.exports = { output: 'standalone', typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true }, experimental: { outputFileTracingRoot: undefined } };" > next.config.js

ENV NEXTAUTH_SECRET="build_placeholder_999"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Prisma & Build
RUN npx prisma generate
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache curl bash ca-certificates \
    && curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh' | bash \
    && apk add --no-cache infisical

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Hier holen wir uns die Dateien - durch das neue next.config.js liegen sie garantiert hier:
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["infisical", "run", "--path", "/smc-office/production", "--", "node", "server.js"]
