import { describe, expect, it } from 'vitest';
import { classify, hostOf, parseUrl, youtubeThumb } from './link';
import { addDays, dueGroup, endOfWeek, formatDate, isoDate } from './dates';
import { matchesSearch, moved, progress, splitLines, statusPatch } from './logic';
import { Item, Subtask } from './models';

describe('link', () => {
  it('finds YouTube videos in every common form', () => {
    for (const u of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5s',
      'youtu.be/dQw4w9WgXcQ?si=x',
      'https://m.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/live/dQw4w9WgXcQ',
    ]) {
      const info = classify(u)!;
      expect(info.kind).toBe('youtube');
      expect(info.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(info.embedUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    }
  });

  it('finds Instagram reels and posts and builds the embed address', () => {
    const reel = classify('https://www.instagram.com/reel/C1a2B3c4D5e/?igsh=abc')!;
    expect(reel).toEqual({ kind: 'instagram', url: 'https://www.instagram.com/reel/C1a2B3c4D5e/', embedUrl: 'https://www.instagram.com/reel/C1a2B3c4D5e/embed' });
    expect(classify('https://instagram.com/p/C1a2B3c4D5e/')!.embedUrl).toBe('https://www.instagram.com/p/C1a2B3c4D5e/embed');
    expect(classify('https://www.instagram.com/someone/reel/C1a2B3c4D5e/')!.url).toBe('https://www.instagram.com/reel/C1a2B3c4D5e/');
    expect(classify('https://www.instagram.com/someone/')!.embedUrl).toBeNull();
  });

  it('never builds an embed from look-alike hosts or bad ids', () => {
    expect(classify('https://evil.com/watch?v=dQw4w9WgXcQ')!.kind).toBe('web');
    expect(classify('https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ')!.kind).toBe('web');
    expect(classify('https://www.youtube.com/watch?v="><script>')!.embedUrl).toBeNull();
  });

  it('rejects things that are not web links', () => {
    for (const bad of ['', '  ', 'hello world', 'javascript:alert(1)', 'ftp://a.com', 'localhost', 'data:text/html,hi']) expect(parseUrl(bad)).toBeNull();
    expect(classify('example.com/page')!.url).toBe('https://example.com/page');
  });

  it('gives a thumbnail and host', () => {
    expect(youtubeThumb('https://youtu.be/dQw4w9WgXcQ')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    expect(youtubeThumb('https://example.com')).toBeNull();
    expect(hostOf('https://www.blog.com/x')).toBe('blog.com');
  });
});

describe('dates', () => {
  it('formats with the full month name', () => {
    expect(formatDate('2026-03-05')).toBe('5 March 2026');
    expect(formatDate('2026-11-17')).toBe('17 November 2026');
    expect(formatDate(null)).toBe('');
  });
  it('uses the local day, not UTC', () => {
    expect(isoDate(new Date(2026, 10, 17, 23, 59))).toBe('2026-11-17');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('week ends on Sunday', () => {
    expect(endOfWeek('2026-11-17')).toBe('2026-11-22'); // Tuesday
    expect(endOfWeek('2026-11-22')).toBe('2026-11-22'); // Sunday
    expect(endOfWeek('2026-11-16')).toBe('2026-11-22'); // Monday
  });
  it('groups due dates', () => {
    const today = '2026-11-17';
    expect(dueGroup(null, today)).toBe('none');
    expect(dueGroup('2026-11-16', today)).toBe('overdue');
    expect(dueGroup('2026-11-17', today)).toBe('today');
    expect(dueGroup('2026-11-22', today)).toBe('week');
    expect(dueGroup('2026-11-23', today)).toBe('later');
  });
});

describe('logic', () => {
  it('splits pasted lists into subtasks', () => {
    expect(splitLines('- Update CV\n* Apply to 5 jobs\n3. Mock interview\n[ ] Rest\n\n  \n[x] Done one')).toEqual([
      'Update CV', 'Apply to 5 jobs', 'Mock interview', 'Rest', 'Done one',
    ]);
    expect(splitLines('   ')).toEqual([]);
    expect(splitLines('Single')).toEqual(['Single']);
  });
  it('moves entries and stops at the ends', () => {
    const l = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(moved(l, 'b', -1).map((x) => x.id)).toEqual(['b', 'a', 'c']);
    expect(moved(l, 'b', 1).map((x) => x.id)).toEqual(['a', 'c', 'b']);
    expect(moved(l, 'a', -1)).toBe(l);
    expect(moved(l, 'c', 1)).toBe(l);
    expect(moved(l, 'zzz', 1)).toBe(l);
  });
  it('counts progress, searches and sets done_at', () => {
    const subs = [{ id: '1', text: 'Buy rice', done: true }, { id: '2', text: 'Cook', done: false }] as Subtask[];
    expect(progress(subs)).toEqual({ done: 1, total: 2 });
    const item = { title: 'Dinner plan', note: null, url: 'https://x.com/ramen' } as Item;
    expect(matchesSearch(item, subs, 'rice')).toBe(true);
    expect(matchesSearch(item, subs, 'RAMEN')).toBe(true);
    expect(matchesSearch(item, subs, 'nope')).toBe(false);
    expect(matchesSearch(item, subs, '  ')).toBe(true);
    expect(statusPatch('done', new Date('2026-01-01T00:00:00Z')).done_at).toBe('2026-01-01T00:00:00.000Z');
    expect(statusPatch('doing').done_at).toBeNull();
  });
});
