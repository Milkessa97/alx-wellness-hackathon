import { useState, useEffect } from 'react';

export function usePathname() {
  const [pathname, setPathname] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  });

  useEffect(() => {
    const handleLocationChange = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('pushstate', handleLocationChange);
    window.addEventListener('replacestate', handleLocationChange);
    window.addEventListener('navigationchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('pushstate', handleLocationChange);
      window.removeEventListener('replacestate', handleLocationChange);
      window.removeEventListener('navigationchange', handleLocationChange);
    };
  }, []);

  return pathname;
}

export function useRouter() {
  return {
    push: (path: string) => {
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new Event('navigationchange'));
      }
    },
    replace: (path: string) => {
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', path);
        window.dispatchEvent(new Event('navigationchange'));
      }
    },
    back: () => {
      if (typeof window !== 'undefined') {
        window.history.back();
      }
    }
  };
}
