# Stage 1: Build
FROM node:20 AS builder
WORKDIR /app

# Diese Variable hilft Prisma, die richtigen Engines zu finden
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Jetzt generieren wir den Client explizit
RUN npx prisma generate

# Dummies für den Build-Prozess
ENV NEXT_OUTPUT_MODE=standalone
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXTAUTH_URL=http://localhost:3000
ENV NEXTAUTH_SECRET=build_placeholder
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

RUN npx next build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# WICHTIG: Alpine braucht die OpenSSL-Library für Prisma
RUN apk add --no-cache curl bash ca-certificates openssl

RUN curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh' | bash \
    && apk add --no-cache infisical

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma Dateien für den Runner
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
