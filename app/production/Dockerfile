# syntax=docker/dockerfile:1.6

# 1) Build static files with Node
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps with caching
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build

# 2) Serve with Nginx
FROM nginx:1.27-alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA-friendly config lives next to this Dockerfile
COPY production/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Use default nginx CMD


