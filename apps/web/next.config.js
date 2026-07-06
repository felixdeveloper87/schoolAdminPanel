/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    // Em dev não há nginx: o Next faz proxy de /api/* para o Nest,
    // mantendo a mesma origem (cookie httpOnly funciona sem CORS).
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL ?? 'http://localhost:3002'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
