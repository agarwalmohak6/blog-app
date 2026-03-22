FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy frontend source code
COPY . .

# Start Vite dev server exposing all available interfaces
CMD ["npm", "run", "dev", "--", "--host"]
