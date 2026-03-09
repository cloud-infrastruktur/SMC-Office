# Stage 1: Build
FROM node:20 AS builder
WORKDIR /app

# Kritisch: Wir sagen Prisma und Next.js, dass wir in einer Docker-Umgebung sind
ENV PRISMA_CLI_BINARY_TARGETS="native,linux-musl-openssl-3.0.x"
ENV SKIP_ENV_VALIDATION=true
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_OUTPUT_MODE=standalone

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Prisma-Pfad fixen: Wir erzwingen die Generierung in den Standard-Ordner
RUN npx prisma generate

# Dummies für NextAuth (verhindert den "collect page data" Absturz)
ENV NEXTAUTH_URL=http://localhost:3000
ENV NEXTAUTH_SECRET=build_placeholder
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

# Build starten
RUN npx next build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache curl bash ca-certificates \
    && curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh' | bash \
    && apk add --no-cache infisical

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Kopieren der Standalone-Files (Pfadanpassung für Enterprise)
COPY --from=builder /app/public ./public
# WICHTIG: Hier greift deine 'outputFileTracingRoot' Logik aus der config
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma Engines für Runtime
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
