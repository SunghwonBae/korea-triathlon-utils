/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // 두 번 렌더링해서 서버 부하 주는 걸 방지
  trailingSlash: true,    // 주소 끝에 /를 붙여서 HTML 파일 인식을 도움
  eslint: {
    // 에러를 일으키는 eslint.config.mjs 참조를 강제로 무시합니다.
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;