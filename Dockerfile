FROM node:24-bookworm-slim
WORKDIR /app
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node", "--experimental-strip-types", "server/index.mjs"]
