// ── Input Validators ──

export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const isYTHost = parsed.hostname === 'youtube.com' ||
           parsed.hostname === 'www.youtube.com' ||
           parsed.hostname === 'youtu.be' ||
           parsed.hostname === 'm.youtube.com';
    if (!isYTHost) return false;
    // Exclude search result pages and channel pages
    const path = parsed.pathname;
    if (path.includes('/results')) return false;
    if (path.includes('/channel/')) return false;
    if (path.includes('/user/')) return false;
    if (path.includes('/@')) return false;
    // Must have a video ID or be a shorts URL
    return !!(parsed.searchParams.get('v') || path.includes('/shorts/') || parsed.hostname === 'youtu.be');
  } catch {
    return false;
  }
}
