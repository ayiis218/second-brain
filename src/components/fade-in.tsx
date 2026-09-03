"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Entrance halus saat elemen masuk viewport.
 *
 * `once: true` — animasi hanya jalan sekali; mengulanginya tiap kali item
 * masuk-keluar viewport membuat scroll panjang terasa gelisah.
 *
 * Delay bertingkat dibatasi 150ms supaya daftar panjang tidak menunda
 * item terakhir berdetik-detik.
 *
 * Kalau perangkat meminta prefers-reduced-motion, komponen ini melewatkan
 * animasi sepenuhnya dan merender anaknya apa adanya.
 */
export function FadeIn({
  children,
  index = 0,
  className,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.25,
        delay: Math.min(index * 0.03, 0.15),
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}
