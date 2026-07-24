import { useEffect, useState } from 'react';
import { getBrowserStorageAdapter } from '../lib/persistence/storage.js';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    void getBrowserStorageAdapter()?.get<string[]>('favorites').then((saved) => {
      if (active && Array.isArray(saved)) setFavorites(saved);
    });
    return () => {
      active = false;
    };
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      void getBrowserStorageAdapter()?.set('favorites', next);
      return next;
    });
  };

  return { favorites, toggleFavorite };
}
