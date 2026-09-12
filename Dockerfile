FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist ./dist
COPY server ./server
RUN mkdir /app/data && chown node:node /app/data
USER node
ENV NODE_ENV=production PORT=3000 ROOM_DATABASE=/app/data/rooms.sqlite
EXPOSE 3000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server/start.js"]
