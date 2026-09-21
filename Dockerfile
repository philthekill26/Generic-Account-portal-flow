# Uses the prebuilt bundle. Run pnpm build first after editing source.
FROM node:22.16.0-slim
WORKDIR /app
COPY dist ./dist
COPY server/index.mjs ./server/index.mjs
COPY package.json ./package.json
ENV HOST=0.0.0.0 PORT=3000 DATA_DIR=/data
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node", "server/index.mjs"]
