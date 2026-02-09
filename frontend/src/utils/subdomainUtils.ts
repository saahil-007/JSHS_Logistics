
export type AppType = 'MANAGER' | 'DRIVER' | 'CUSTOMER';

export const getAppType = (): AppType => {
    // Check query params first (highest priority)
    if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const roleParam = urlParams.get('role')?.toUpperCase();
        if (roleParam === 'MANAGER') return 'MANAGER';
        if (roleParam === 'DRIVER') return 'DRIVER';
    }

    const pathname = window.location.pathname;
    
    // Path-based detection
    if (pathname.includes('/manager')) return 'MANAGER';
    if (pathname.includes('/driver')) return 'DRIVER';

    // Default to CUSTOMER (jshs.app main domain)
    return 'CUSTOMER';
};
