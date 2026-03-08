export async function getCameraStream() {
  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30, max: 60 },
    },
    audio: false,
  });
}

export function getCameraCapabilities(track) {
  if (!track || typeof track.getCapabilities !== "function") {
    return {};
  }
  return track.getCapabilities();
}

export async function setCameraZoom(track, zoom) {
  if (!track || typeof track.applyConstraints !== "function") {
    throw new Error("Camera track is not available.");
  }
  await track.applyConstraints({
    advanced: [{ zoom }],
  });
}

export async function optimizeTrackForQr(track) {
  if (!track || typeof track.applyConstraints !== "function") {
    return;
  }

  const capabilities = getCameraCapabilities(track);
  const advanced = [];

  if (Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes("continuous")) {
    advanced.push({ focusMode: "continuous" });
  }

  if (Array.isArray(capabilities.exposureMode) && capabilities.exposureMode.includes("continuous")) {
    advanced.push({ exposureMode: "continuous" });
  }

  if (advanced.length === 0) {
    return;
  }

  try {
    await track.applyConstraints({ advanced });
  } catch {
    // Ignore optional optimization failures and keep camera active.
  }
}

export function getCurrentZoom(track) {
  if (!track || typeof track.getSettings !== "function") {
    return null;
  }
  const settings = track.getSettings();
  return typeof settings.zoom === "number" ? settings.zoom : null;
}

export function stopCameraStream(stream) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}
