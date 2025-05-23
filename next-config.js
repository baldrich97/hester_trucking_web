const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
})
module.exports = withBundleAnalyzer({
    webpack: (config) => {
        config.resolve.alias['@prisma/client'] = path.resolve(__dirname, 'prisma/generated/client');
        return config;
    },
})