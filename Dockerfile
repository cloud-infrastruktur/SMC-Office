# Stage 1: Build
FROM node:20 AS builder
WORKDIR /app
# NUR package.json kopieren
COPY package.json ./
# Fresh Install ohne die korrupte Lock-Datei
RUN npm install --legacy-peer-deps
COPY . .
RUN npx prisma generate
ENV NEXT_OUTPUT_MODE=standalone
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache curl bash ca-certificates \
    && curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.alpine.sh' | bash \
    && apk add --no-cache infisical
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone/nextjs_space ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
