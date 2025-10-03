import {createLocalizedPathnamesNavigation} from 'next-intl/navigation';

export const locales = ['en', 'tr'] as const;
export const localePrefix = 'always'; // Varsayılan: "always"

export const {Link, redirect, usePathname, useRouter} =
    createLocalizedPathnamesNavigation({
        locales,
        localePrefix
    });