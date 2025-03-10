FROM node:22-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-distutils \      
    python3-dev \
    make \
    g++ \
    gcc \
    git \
    libssl-dev \           
    build-essential

WORKDIR /app

ENV NEXT_PRIVATE_STANDALONE true

COPY package.json pnpm-lock.yaml ./
COPY prisma ./

RUN npm install -g pnpm@9.12.2 && \
    if [ "$USE_MIRROR" = "true" ]; then \
        echo "Using mirror registry..." && \
        npm install -g nrm && \
        nrm use taobao; \
    fi && \
    pnpm install

COPY . .
RUN pnpm build
RUN pnpm build-seed 

FROM node:22-slim AS runner

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    tzdata \
    openssl
  
RUN npm install -g prisma
WORKDIR /app

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY --from=builder /app/seed.js ./seed.js
COPY --from=builder /app/resetpassword.js ./resetpassword.js
COPY --from=builder /app/node_modules/@libsql/linux-arm64-gnu ./node_modules/@libsql/linux-arm64-gnu

ENV NODE_ENV=production \
    PORT=1111 \
    HOSTNAME=0.0.0.0

EXPOSE 1111

CMD ["sh", "-c", "prisma migrate deploy && node seed.js && node server.js"]
