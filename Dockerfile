# For Node.js
FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8082
CMD ["npm", "start"]