const pendingZoomLevels = new Map();

const removePendingZoom = (tabId, zoomLevel) => {
  const zoomLevels = pendingZoomLevels.get(tabId);
  if (!zoomLevels) return;

  const index = zoomLevels.findIndex(
    (pendingZoom) => Math.abs(pendingZoom - zoomLevel) < 0.0001,
  );
  if (index === -1) return;

  zoomLevels.splice(index, 1);
  if (!zoomLevels.length) pendingZoomLevels.delete(tabId);
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  if (!tabId) return;

  if (request.action === "setZoom") {
    const zoomLevels = pendingZoomLevels.get(tabId) || [];
    zoomLevels.push(request.zoomLevel);
    pendingZoomLevels.set(tabId, zoomLevels);

    chrome.tabs.setZoom(tabId, request.zoomLevel, () => {
      if (chrome.runtime.lastError) {
        removePendingZoom(tabId, request.zoomLevel);
      }
      sendResponse({ success: !chrome.runtime.lastError });
    });
    return true;
  }

  if (request.action === "getZoom") {
    chrome.tabs.getZoom(tabId, (zoom) => {
      const zoomLevel = typeof zoom === "number" ? zoom : 1.0;
      sendResponse({ zoomLevel });
    });
    return true;
  }
});

chrome.tabs.onZoomChange.addListener(({ tabId, newZoomFactor }) => {
  const zoomLevels = pendingZoomLevels.get(tabId);
  const isExtensionChange = zoomLevels?.some(
    (zoomLevel) => Math.abs(zoomLevel - newZoomFactor) < 0.0001,
  );
  if (isExtensionChange) {
    removePendingZoom(tabId, newZoomFactor);
    return;
  }

  chrome.tabs.sendMessage(tabId, {
    action: "zoomChanged",
    zoomLevel: newZoomFactor,
  }, () => {
    void chrome.runtime.lastError;
  });
});
