# Dockerfile for AI Sport Backend (Node.js/Express)

# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port 3001
EXPOSE 3001

# Start the application
CMD ["npm", "start"]