# Use a Node.js base image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy project files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/ ./apps/
COPY packages/ ./packages/

# Change ownership of the entire app directory to the node user
RUN chown -R node:node /app

# Switch to the non-root user
USER node

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build the backend
RUN pnpm --filter backend build

# Build the frontend
RUN pnpm --filter frontend build

# Expose the frontend port
EXPOSE 3000

# Start the backend and frontend
CMD ["sh", "-c", "pnpm run dev:backend & pnpm run dev:frontend"]