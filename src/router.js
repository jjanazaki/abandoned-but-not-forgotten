import { useEffect, useState } from 'react';

// Tiny hash router: #/  ·  #/body/:id  ·  #/tool/:id
export function parseHash(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'body' && parts[1]) return { name: 'body', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'tool' && parts[1]) return { name: 'tool', id: decodeURIComponent(parts[1]) };
  return { name: 'home' };
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const go = (path) => {
  window.location.hash = path;
};

// remembers which world you were last in so "back" lands on it in the carousel
export const nav = { lastBody: null };
