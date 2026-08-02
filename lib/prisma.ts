import { PrismaPg } from "@prisma/adapter-pg";
// 상대경로로 가져온다 — next와 tsx(시드)가 같은 방식으로 해석하게.
import { PrismaClient } from "../generated/prisma/client";

/**
 * 연결은 처음 쓸 때 만든다.
 *
 * 모듈을 불러오는 순간 연결을 만들면 `next build`가 페이지를 훑을 때도 연결을 요구한다.
 * 빌드 단계에는 데이터베이스가 없으므로 거기서 빌드가 통째로 죽는다.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // 조용히 기본 포트로 붙어서 "연결 거부"만 남기면 원인을 찾는 데 시간이 든다.
    throw new Error("DATABASE_URL이 없다. docker-compose가 넣어주거나 .env에 있어야 한다.");
  }

  // Prisma 7은 스키마에 url을 두지 않고 드라이버 어댑터로 연결한다.
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  // dev의 HMR이 커넥션을 무한히 늘리지 않게 전역에 한 번만 매단다.
  globalForPrisma.prisma = client;
  return client;
}
