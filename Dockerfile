# Use official Bun image
FROM oven/bun:1

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy application source code
COPY . .

# Create localcache directory for runtime (will be persisted via volume)
RUN mkdir -p services/localcache/stocks

# Expose the port the app runs on (default is 8080)
EXPOSE 8080

# Set environment to production
ENV NODE_ENV=production

# Run the app using Bun
CMD ["bun", "run", "index.ts"]

