ARG NODE_VERSION=20.19.5

FROM node:${NODE_VERSION}-alpine AS dependencies
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci --ignore-scripts

FROM dependencies AS source
COPY apps/api apps/api
COPY apps/web apps/web

FROM source AS api-migrate
ENV NODE_ENV=production
RUN npm run prisma:generate --workspace=@nexora/api
CMD ["npm", "run", "prisma:migrate:deploy", "--workspace=@nexora/api"]

FROM source AS api-build
RUN npm run build --workspace=@nexora/api
RUN npm prune --omit=dev --workspaces

FROM node:${NODE_VERSION}-alpine AS api
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
WORKDIR /app

COPY --from=api-build --chown=node:node /workspace/package.json /workspace/package-lock.json ./
COPY --from=api-build --chown=node:node /workspace/node_modules node_modules
COPY --from=api-build --chown=node:node /workspace/apps/api/package.json apps/api/package.json
COPY --from=api-build --chown=node:node /workspace/apps/api/node_modules apps/api/node_modules
COPY --from=api-build --chown=node:node /workspace/apps/api/dist apps/api/dist

USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]

FROM source AS web-build
RUN npm run build --workspace=@nexora/web

FROM nginx:1.29-alpine AS web
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /workspace/dist/nexora-workspace/browser /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
