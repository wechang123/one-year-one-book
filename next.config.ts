import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 기본값 1MB. 폰으로 찍은 사진은 2~5MB라 이 설정이 없으면
      // 업로드가 오류 없이 조용히 실패한다. 이 서비스는 사진이 콘텐츠라 치명적이다.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
