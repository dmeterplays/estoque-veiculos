# ============================================
# Stage 1: Build (montar o projeto)
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copia arquivos de dependência primeiro (cache do Docker)
COPY package.json package-lock.json* ./
RUN npm ci

# Copia o restante do código
COPY . .

# Variáveis precisam existir no momento do build
# (o Next.js executa os route handlers durante "collecting page data")
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# Faz o build de produção
RUN npm run build

# ============================================
# Stage 2: Runtime (só o necessário pra rodar)
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Cria usuário sem privilégios (segurança)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copia só o resultado do build (não copia node_modules inteiro)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]