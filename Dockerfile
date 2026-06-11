# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install all dependencies (including dev)
RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma client
RUN pnpm prisma generate

# Build TypeScript
RUN pnpm build


# Stage 2: Production
FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.20.0 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built output and generated prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated

# Generate Prisma client in production stage
RUN pnpm prisma generate

# Copy email templates (needed at runtime)
COPY src/templates ./src/templates

EXPOSE 5000

CMD ["node", "dist/server.js"]
