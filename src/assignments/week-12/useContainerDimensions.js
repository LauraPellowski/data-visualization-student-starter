import React, { useState, useEffect } from 'react';

export const useContainerDimensions = (divRef) => {
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const element = divRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions((current) => {
          if (current.width === width && current.height === height) {
            return current;
          }
          return { width, height };
        });
      }
    });

    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, [divRef]);

  return dimensions;
};
