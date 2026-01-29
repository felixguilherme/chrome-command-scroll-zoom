chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  if (!tabId) return;

  if (request.action === "setZoom") {
    chrome.tabs.setZoom(tabId, request.zoomLevel, () => {
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
