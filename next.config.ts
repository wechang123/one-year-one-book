import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /**
       * 기본값 1MB. 폰으로 찍은 사진은 2~5MB라 이 설정이 없으면
       * 업로드가 오류 없이 조용히 실패한다. 이 서비스는 사진이 콘텐츠라 치명적이다.
       *
       * 🔑 왜 앱 한도(8MiB)와 같은 값이 아니라 더 큰가
       *   이 값은 **파일이 아니라 요청 본문 전체**에 걸린다. multipart 경계 문자열,
       *   필드 이름, 아이 말·만든 날까지 다 포함된 크기다.
       *   두 값을 같게 두면 8MiB를 넘는 파일은 본문이 먼저 잘려 **액션이 시작조차 못 한다.**
       *   그러면 actions.ts의 "사진이 너무 큽니다"는 도달할 수 없는 죽은 코드가 되고,
       *   사용자는 한국어 안내 대신 빈 오류를 본다. 실제로 그 상태였다.
       *   여유를 둬서 **크기 판단을 앱이 하게** 만든다. 이건 서버의 마지막 방어선이다.
       */
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
