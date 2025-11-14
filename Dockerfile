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

# Set default environment variables
# These can be overridden when running the container with -e flags
ENV NODE_ENV=production
ENV PORT=8080
ENV ENVIRONMENT=production
ENV YAHOO_SCRAPE_INTERVAL=20
ENV GOOGLE_SCRAPE_INTERVAL=200

# Run the app using Bun
CMD ["bun", "run", "index.ts"]

