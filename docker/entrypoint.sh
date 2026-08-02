#!/bin/sh
set -e

echo "[entrypoint] TZ=${TZ:-unset} / 컨테이너 시각 $(date '+%Y-%m-%d %H:%M:%S %Z')"

# 마이그레이션은 몇 번을 돌려도 같은 상태가 되어야 한다.
if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "[entrypoint] prisma migrate deploy"
  npx prisma migrate deploy
else
  echo "[entrypoint] 적용할 마이그레이션 없음 — 건너뜀"
fi

echo "[entrypoint] seed"
npm run seed

echo "[entrypoint] next start :${PORT:-3000}"
exec npx next start -p "${PORT:-3000}" -H 0.0.0.0
