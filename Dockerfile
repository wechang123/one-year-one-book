FROM node:24-slim

# openssl: Prisma 엔진 / tzdata: TZ=Asia/Seoul이 실제로 먹히게
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates tzdata \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 레이어를 먼저 굳혀서 소스만 바뀔 때 재설치하지 않게 한다.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# 생성된 Prisma 클라이언트는 저장소에 없다. 이미지 안에서 만든다.
RUN npx prisma generate && npm run build

RUN chmod +x docker/entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

ENTRYPOINT ["/app/docker/entrypoint.sh"]
