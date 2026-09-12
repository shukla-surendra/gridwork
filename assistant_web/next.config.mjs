/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export -- this app is 100% client-rendered behind auth (a
  // dashboard, not a public site), so there's no SSR benefit to give up.
  // `next build` emits a plain static `out/` directory servable by the
  // exact same nginx setup the CRA build uses today (see ../assistant_web
  // /Dockerfile + nginx.conf.template).
  output: 'export',
  // Next's built-in Image component needs a running server to optimize
  // images on request -- unavailable for a static export.
  images: { unoptimized: true },
  // Same call the CRA Docker build already makes (DISABLE_ESLINT_PLUGIN=true
  // in ../assistant_web/Dockerfile): lint is a CI/review-time gate, not a
  // build-blocking one -- a stray warning in code carried over from the CRA
  // app shouldn't be able to break the production build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
