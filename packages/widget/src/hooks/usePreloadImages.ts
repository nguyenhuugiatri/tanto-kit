import { useEffect } from 'react';

export const usePreloadImages = (imageSources: string[]) => {
  useEffect(() => {
    const images = imageSources.map(src => {
      const img = new Image();
      img.src = src;
      return img;
    });

    return () => {
      images.forEach(img => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [imageSources]);
};
