import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

if (typeof window !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  // jsdom lacks these browser APIs; Radix UI and sonner call them.
  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView ??= () => {};
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
}
