export async function getCameraStream() {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
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
