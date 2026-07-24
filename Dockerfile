FROM debian:12-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    npm \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

ENV PORT=8054
ENV APP_VERSION=1.5.0

EXPOSE 8054

CMD ["node", "server.js"]
