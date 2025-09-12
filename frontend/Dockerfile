FROM node:20

ENV TZ=Asia/Seoul
RUN apt-get update && apt-get install -y tzdata && \
    ln -snf /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app


COPY package*.json ./
RUN npm install


COPY . .


CMD ["npm", "run", "dev"]
