import { Kind } from './models';

export interface LinkInfo {
  kind: Kind;
  /** Cleaned link (tracking parts removed for YouTube and Instagram posts). */
  url: string;
  /** Safe iframe address, only when we can build one from a validated id. */
  embedUrl: string | null;
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const IG_ID = /^[A-Za-z0-9_-]{5,40}$/;

/** Accepts what people paste: adds https:// when missing. Returns null if it is not a web link. */
export function parseUrl(raw: string): URL | null {
  let text = (raw ?? '').trim();
  if (!text || /\s/.test(text)) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) text = 'https://' + text;
  try {
    const u = new URL(text);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (!u.hostname.includes('.')) return null;
    return u;
  } catch {
    return null;
  }
}

export function classify(raw: string): LinkInfo | null {
  const u = parseUrl(raw);
  if (!u) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const seg = u.pathname.split('/').filter(Boolean);

  let yt: string | null = null;
  if (host === 'youtu.be') yt = seg[0] ?? null;
  else if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(host)) {
    if (seg[0] === 'watch') yt = u.searchParams.get('v');
    else if (['shorts', 'embed', 'live', 'v'].includes(seg[0])) yt = seg[1] ?? null;
  }
  if (yt && YT_ID.test(yt)) {
    return { kind: 'youtube', url: `https://www.youtube.com/watch?v=${yt}`, embedUrl: `https://www.youtube-nocookie.com/embed/${yt}` };
  }

  if (host === 'instagram.com') {
    for (let i = 0; i < seg.length - 1 && i < 2; i++) {
      if (['reel', 'reels', 'p', 'tv'].includes(seg[i]) && IG_ID.test(seg[i + 1])) {
        const type = seg[i] === 'reels' ? 'reel' : seg[i];
        const base = `https://www.instagram.com/${type}/${seg[i + 1]}/`;
        return { kind: 'instagram', url: base, embedUrl: base + 'embed' };
      }
    }
    return { kind: 'instagram', url: u.origin + u.pathname, embedUrl: null };
  }

  return { kind: 'web', url: u.toString(), embedUrl: null };
}

export function youtubeThumb(url: string): string | null {
  const info = classify(url);
  const m = info?.kind === 'youtube' ? /v=([^&]+)/.exec(info.url) : null;
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null;
}

export function hostOf(url: string | null): string {
  const u = url ? parseUrl(url) : null;
  return u ? u.hostname.replace(/^www\./, '') : '';
}
