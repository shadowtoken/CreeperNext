export const testPort = 3211;
export const testOrigin = `http://127.0.0.1:${testPort}`;

export const viewportMatrix = [
  { name: "mobile-320", viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true },
  { name: "mobile-390", viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  { name: "landscape-568", viewport: { width: 568, height: 320 }, hasTouch: true, isMobile: true },
  { name: "regular-768", viewport: { width: 768, height: 1024 } },
  { name: "regular-1024", viewport: { width: 1024, height: 768 } },
  { name: "compact-1280x800", viewport: { width: 1280, height: 800 } },
  { name: "compact-1280x832", viewport: { width: 1280, height: 832 } },
  { name: "wide-1440", viewport: { width: 1440, height: 900 } },
  { name: "wide-1920", viewport: { width: 1920, height: 1080 } },
] as const;
