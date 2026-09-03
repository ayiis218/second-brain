import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

// Versi bawaan shadcn memanggil setState langsung di dalam useEffect, yang
// ditolak aturan react-hooks/set-state-in-effect. useSyncExternalStore adalah
// cara React membaca state dari sumber eksternal seperti matchMedia, dan
// sekaligus memberi nilai server-render yang eksplisit.
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false, // di server, anggap desktop
  )
}
