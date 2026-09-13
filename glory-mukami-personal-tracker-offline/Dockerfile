# The server, for wherever it is hosted.
#
# Two stages so the image that runs carries no build tooling. The client is
# built inside the image rather than copied in, so what runs is what the
# source says — no "worked on my laptop" build artefacts.

FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile
COPY . .
# VITE_* values are baked into the client at build time. Pass them with
# --build-arg; the runtime ones (MONGODB_URI, JWT_SECRET, ...) come as env.
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_API_URL
RUN pnpm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
