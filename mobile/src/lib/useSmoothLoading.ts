import { useEffect, useRef, useState } from "react";

/**
 * Menghaluskan status loading agar skeleton tidak berkedip.
 * - delay: skeleton baru muncul setelah loading berlangsung selama ini
 * - minDuration: kalau sudah muncul, tahan setidaknya selama ini
 */
export function useSmoothLoading(
  loading: boolean,
  delay = 200,
  minDuration = 450,
) {
  const [show, setShow] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (loading) {
      timer = setTimeout(() => {
        shownAt.current = Date.now();
        setShow(true);
      }, delay);
    } else if (show) {
      const remain = Math.max(0, minDuration - (Date.now() - shownAt.current));
      timer = setTimeout(() => setShow(false), remain);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading, show, delay, minDuration]);

  return show;
}
