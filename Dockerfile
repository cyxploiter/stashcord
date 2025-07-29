# Use a Node.js base image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy the root package.json and pnpm-workspace.yaml
COPY package.json pnpm-workspace.yaml ./

# Copy the apps and packages
COPY apps/ ./apps/
COPY packages/ ./packages/

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