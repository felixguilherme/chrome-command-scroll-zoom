const modifierKey = "metaKey";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const STEP = 0.1; // 10% per scroll tick
const SMOOTHING = 0.35;

let currentZoom = 1.0;
let targetZoom = 1.0;
let animating = false;
let initialized = false;
let userAdjusted = false;

const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

const initZoom = () => {
  if (initialized) return;
  chrome.runtime.sendMessage({ action: "getZoom" }, (response) => {
    const zoomLevel = Number(response?.zoomLevel) || 1.0;
    if (!userAdjusted) {
      currentZoom = clampZoom(zoomLevel);
      targetZoom = currentZoom;
    }
    initialized = true;
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

const handleWheel = (event) => {
  if (!event[modifierKey]) return;

  event.preventDefault();
  initZoom();
  userAdjusted = true;

  const direction = event.deltaY > 0 ? -1 : 1;
  targetZoom = clampZoom(targetZoom + direction * STEP);

  if (!animating) {
    animating = true;
    requestAnimationFrame(stepZoom);
  }
};

document.addEventListener("wheel", handleWheel, { passive: false });
