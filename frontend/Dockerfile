# Node 기반 이미지 사용
FROM node:18

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

# 컨테이너 실행 시 React 서버 실행
CMD ["npm", "run", "preview"]
