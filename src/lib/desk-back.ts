let armed = false;

/** One history entry so the phone Back key returns to the main page. */
export function armDeskBack() {
  if (armed || typeof window === "undefined") return;
  armed = true;
  window.history.pushState({ gmsDesk: 1 }, "");
}

export function watchDeskBack(close: () => void) {
  const onPop = () => {
    armed = false;
    close();
  };
  window.addEventListener("popstate", onPop);
  return () => window.removeEventListener("popstate", onPop);
}
