const modifierKey = "metaKey";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const STEP = 0.1; // 10% per scroll tick
const SMOOTHING = 0.35;

let currentZoom = 1.0;
let targetZoom = 1.0;
let animating = false;
let initialized = false;
let initializing = false;
let pendingSteps = 0;

const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

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
    targetZoom = currentZoom;
    initialized = true;
    initializing = false;

    if (pendingSteps) {
      targetZoom = clampZoom(targetZoom + pendingSteps * STEP);
      pendingSteps = 0;
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
    targetZoom = currentZoom;
    initialized = true;
  }
});

const handleWheel = (event) => {
  if (!event[modifierKey]) return;

  event.preventDefault();

  const direction = event.deltaY > 0 ? -1 : 1;
  if (!initialized) {
    pendingSteps += direction;
    initializeZoom();
    return;
  }

  targetZoom = clampZoom(targetZoom + direction * STEP);
  startAnimation();
};

document.addEventListener("wheel", handleWheel, { passive: false });
