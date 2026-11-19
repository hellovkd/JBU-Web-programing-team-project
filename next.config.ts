import type { NextConfig } from "next";

// 개발 중 잠재적인 문제를 찾도록 React Strict Mode를 활성화합니다.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // 설치된 Next.js에 적용되는 보안 권고가 있으면 보안 패치가 포함된 버전으로 안내합니다.
    agentUpgrade: "security",
  },
};

export default nextConfig;
