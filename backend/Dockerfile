FROM node:20-slim

ENV NODE_ENV=production

WORKDIR /app

# Install dependencies first (better layer caching)
# Full install (incl. devDependencies) — the dev compose runs nodemon via this
# image; docker-compose.prod.yml overrides CMD to plain `node` so the extra
# dev packages never run in production, just add a few hundred KB to the image.
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "index.js"]
