# syntax=docker/dockerfile:1

# --- Build stage ---
FROM node:22-alpine AS builder
WORKDIR /app

# Prisma 在 Alpine 需要这些依赖
RUN apk add --no-cache libc6-compat openssl

COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm ci

# Prisma generate 需要 schema
COPY prisma ./prisma
RUN npx prisma generate

# 拷贝其余源代码并构建
COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Prisma 在 Alpine 需要这些依赖
RUN echo "deb https://mirrors.tuna.tsinghua.edu.cn/debian/ trixie main contrib non-free non-free-firmware" >> /etc/apt/sources.list && apt-get update
RUN apk add --no-cache libc6-compat openssl

# 复制运行所需文件
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY next.config.mjs ./next.config.mjs
COPY package*.json ./

EXPOSE 3000

# 在启动前做一次迁移部署，确保 SQLite 结构一致
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
