FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci --omit=dev
COPY server/src ./server/src
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "server"]

