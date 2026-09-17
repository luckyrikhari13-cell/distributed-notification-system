FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

CMD ["node", "server.js"]

# COPY . .
#      ↑ ↑
#      │ └── destination inside container
#      └──── source from your project

