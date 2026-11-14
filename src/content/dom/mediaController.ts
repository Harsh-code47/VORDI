// src/content/dom/mediaController.ts
// Controls HTML5 video and audio playback on active pages

export function controlMedia(action: 'play' | 'pause'): { success: boolean; message: string } {
  const mediaElements = Array.from(document.querySelectorAll<HTMLMediaElement>('video, audio'));

  if (mediaElements.length === 0) {
    return { success: false, message: 'No media element found on page' };
  }

  let count = 0;
  for (const media of mediaElements) {
    try {
      if (action === 'play') {
        media.play();
        count++;
      } else {
        media.pause();
        count++;
      }
    } catch {
      // Ignore autoplay policy rejections
    }
  }

  return {
    success: count > 0,
    message: count > 0 ? `${action === 'play' ? 'Playing' : 'Paused'} media` : 'Media action failed'
  };
}

