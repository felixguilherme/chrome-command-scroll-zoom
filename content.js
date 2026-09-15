const modifierKey = "metaKey";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_INCREMENT = 0.05;
const MAX_STEP = 0.05; // 5% maximum per scroll event
const PIXELS_PER_STEP = 25;
const LINE_HEIGHT = 40;
const SMOOTHING = 0.35;

let currentZoom = 1.0;
let targetZoom = 1.0;
let rawTargetZoom = 1.0;
let animating = false;
let initialized = false;
let initializing = false;
let pendingZoomDelta = 0;

const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
const snapZoom = (value) =>
  Number(
    (Math.round(clampZoom(value) / ZOOM_INCREMENT) * ZOOM_INCREMENT).toFixed(2),
  );

const startAnimation = () => {
  if (animating) return;
  animating = true;
  requestAnimationFrame(stepZoom);
};

const initializeZoom = () => {
  if (initialized || initializing) return;
  initializing = true;
  chrome.runtime.sendMessage({ action: "getZoom" }, (response) => {
    const zoomLevel = Number(response?.zoomLevel) || 1.0;
    currentZoom = clampZoom(zoomLevel);
    rawTargetZoom = currentZoom;
    targetZoom = snapZoom(rawTargetZoom);
    initialized = true;
    initializing = false;

    if (pendingZoomDelta) {
      rawTargetZoom = clampZoom(rawTargetZoom + pendingZoomDelta);
      targetZoom = snapZoom(rawTargetZoom);
      pendingZoomDelta = 0;
      startAnimation();
    }
  });
};

const stepZoom = () => {
  const delta = targetZoom - currentZoom;
  if (Math.abs(delta) < 0.001) {
    currentZoom = targetZoom;
    animating = false;
    chrome.runtime.sendMessage({ action: "setZoom", zoomLevel: currentZoom });
    return;
  }

  currentZoom += delta * SMOOTHING;
  chrome.runtime.sendMessage({ action: "setZoom", zoomLevel: currentZoom });
  requestAnimationFrame(stepZoom);
};

chrome.runtime.onMessage.addListener((message) => {
  if (message.action !== "zoomChanged" || animating || initializing) return;

  const zoomLevel = Number(message.zoomLevel);
  if (zoomLevel > 0) {
    currentZoom = clampZoom(zoomLevel);
    rawTargetZoom = currentZoom;
    targetZoom = snapZoom(rawTargetZoom);
    initialized = true;
  }
});

const handleWheel = (event) => {
  if (!event[modifierKey] || event.deltaY === 0) return;

  event.preventDefault();

  const deltaMultiplier =
    event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? LINE_HEIGHT
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? window.innerHeight
        : 1;
  const zoomAmount = Math.min(
    MAX_STEP,
    (Math.abs(event.deltaY) * deltaMultiplier * MAX_STEP) / PIXELS_PER_STEP,
  );
  const zoomDelta = event.deltaY > 0 ? -zoomAmount : zoomAmount;

  if (!initialized) {
    pendingZoomDelta += zoomDelta;
    initializeZoom();
    return;
  }

  rawTargetZoom = clampZoom(rawTargetZoom + zoomDelta);
  targetZoom = snapZoom(rawTargetZoom);
  startAnimation();
};

document.addEventListener("wheel", handleWheel, { passive: false });
