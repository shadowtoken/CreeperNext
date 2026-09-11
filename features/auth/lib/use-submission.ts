"use client";

import { useRef, useState } from "react";

/** A synchronous lock also blocks two submissions in the same render frame. */
export function useSubmission() {
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  function start() {
    if (locked.current) return false;
    locked.current = true;
    setPending(true);
    return true;
  }
  function finish() {
    locked.current = false;
    setPending(false);
  }
  return { pending, start, finish };
}
