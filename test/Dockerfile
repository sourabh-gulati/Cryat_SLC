FROM cypress/included:cypress-16.2.1-node-26.13.0-chrome-156.0.8078.73-1-ff-159.0-edge-156.0.4314.50-1
WORKDIR /app
COPY package*.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci
COPY . .
ENTRYPOINT []
