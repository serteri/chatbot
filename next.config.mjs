/** @type {import('next').NextConfig} */
import withNextIntl from 'next-intl/plugin';

const withIntl = withNextIntl('./src/i18n.ts');

const nextConfig = {
    // i18n ayarını kaldır, next-intl bunu yönetecek
};

export default withIntl(nextConfig);