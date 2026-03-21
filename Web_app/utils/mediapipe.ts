let filesetResolverPromise: Promise<any> | null = null;

export async function getVisionFilesetResolver() {
  if (typeof window === 'undefined') return null;
  if (!filesetResolverPromise) {
    const { FilesetResolver } = await import('@mediapipe/tasks-vision');
    filesetResolverPromise = FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.x/wasm"
    );
  }
  return filesetResolverPromise;
}
