import { expect, Page, test } from '@playwright/test';
import { FakeSupabase } from './fake-supabase';

const YT = 'https://youtu.be/dQw4w9WgXcQ?si=abc';
const IG = 'https://www.instagram.com/reel/C1a2B3c4D5e/?igsh=xyz';

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function addStep(page: Page, text: string) {
  const box = page.getByLabel('New step');
  await box.fill(text);
  await box.press('Enter');
  await expect(page.getByLabel('Step text').filter({ hasText: '' }).last()).toBeVisible();
}

test('main flow: login, folders, YouTube item with steps, Instagram item, today, search, layout', async ({ page, context }) => {
  const fake = new FakeSupabase();
  await fake.install(context);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // ---- login with an email code
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Your email').fill('sakshi@example.com');
  await page.getByRole('button', { name: 'Send me a code' }).click();
  await page.getByLabel('6 digit code').fill('000000');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('wrong or has expired');
  await page.getByLabel('6 digit code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Saved Space' })).toBeVisible();
  // icons really draw (an earlier bug hid them all while every click still worked)
  await expect(page.locator('.bottom-nav ss-icon svg path').first()).toBeAttached();
  expect(await page.locator('.bottom-nav ss-icon svg').first().evaluate((el) => (el as SVGElement).getBoundingClientRect().width)).toBeGreaterThan(10);

  // ---- folders: suggested defaults, rename, reorder
  await expect(page.getByText('No folders yet')).toBeVisible();
  await page.getByRole('button', { name: 'Add Work, Gym, Food, Goals' }).click();
  await expect(page.locator('a.folder')).toHaveText([/Work/, /Gym/, /Food/, /Goals/]);
  await page.getByRole('button', { name: 'Edit folders' }).click();
  await page.getByRole('button', { name: 'Move up' }).nth(3).click(); // Goals above Food
  await page.getByLabel('Folder name').nth(0).fill('Job prep');
  await page.getByLabel('Folder name').nth(0).press('Enter');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('a.folder .name')).toHaveText(['Job prep', 'Gym', 'Goals', 'Food']);
  expect([...fake.tables.ss_folders].sort((a, b) => a.sort - b.sort).map((f) => f.name)).toEqual(['Job prep', 'Gym', 'Goals', 'Food']);
  expect(fake.tables.ss_folders.every((f) => f.sort >= 0)).toBe(true);

  // ---- YouTube item in Gym
  await page.locator('a.folder', { hasText: 'Gym' }).click();
  await expect(page.getByText('Nothing saved here yet')).toBeVisible();
  await page.getByRole('link', { name: 'Add', exact: true }).click();
  await page.getByLabel('Link (optional)').fill(YT);
  await expect(page.getByLabel('Title')).toHaveValue('Full body workout'); // auto-filled from the preview
  expect(fake.previewHeaders[0]['x-access-token']).toBe('fake.jwt.token'); // token goes in a header
  expect(fake.previewUrls[0]).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ'); // cleaned link
  await page.getByLabel('Title').fill('Full body workout, 20 minutes, no equipment needed at all so it is easy to do anywhere');
  await page.getByLabel('Note (optional)').fill('Do this on Mondays');
  await page.getByRole('button', { name: 'Save' }).click();

  // ---- item screen: player + steps
  await expect(page.locator('iframe')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  await expect(page.getByRole('link', { name: 'Open on YouTube' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await expect(page.getByLabel('Title').first()).toHaveValue(/no equipment needed/); // long title wraps in a textarea
  for (const s of ['Warm up', 'Squats', 'Stretch']) await addStep(page, s);
  await expect(page.getByLabel('Step text')).toHaveCount(3);
  await expect(page.getByLabel('New step')).toBeFocused(); // can keep typing steps

  // pasted list becomes several steps
  await page.getByLabel('New step').evaluate((el) => {
    const dt = new DataTransfer();
    dt.setData('text', '- Cool down\n- Drink water');
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await expect(page.getByLabel('Step text')).toHaveCount(5);
  await page.getByRole('button', { name: 'Delete step' }).nth(4).click();
  await page.getByRole('button', { name: 'Delete step' }).nth(3).click();
  await expect(page.getByLabel('Step text')).toHaveCount(3);

  // reorder, edit, tick
  await page.getByRole('button', { name: 'Move step up' }).nth(2).click(); // Stretch above Squats
  await expect(page.getByLabel('Step text')).toHaveValue(['Warm up', 'Stretch', 'Squats'] as any, { timeout: 100 }).catch(() => undefined);
  const texts = async () => page.getByLabel('Step text').evaluateAll((els) => els.map((e) => (e as HTMLTextAreaElement).value));
  await expect.poll(texts).toEqual(['Warm up', 'Stretch', 'Squats']);
  await page.getByLabel('Step text').nth(0).fill('Warm up 5 minutes');
  await page.getByLabel('Step text').nth(0).press('Enter');
  await page.getByRole('checkbox').nth(0).check();
  await page.getByRole('checkbox').nth(1).check();
  await expect(page.getByRole('heading', { name: /Steps \(2\/3\)/ })).toBeVisible();
  // never auto-completes
  await expect(page.getByRole('button', { name: 'Todo', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('All steps are ticked')).toHaveCount(0);
  await page.getByRole('checkbox').nth(2).check();
  await expect(page.getByText('All steps are ticked')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Todo', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Mark as done' }).click();
  await expect(page.getByRole('button', { name: 'Done', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(fake.tables.ss_items[0].status).toBe('done');
  expect(fake.tables.ss_items[0].done_at).toBeTruthy();
  expect(fake.tables.ss_subtasks.map((s) => s.sort).sort()).toEqual([0, 1, 2]);

  // due date
  await page.getByLabel('Due date').fill(todayIso());
  await expect(page.getByText(/^Due \d{1,2} [A-Z][a-z]+ \d{4}$/)).toBeVisible(); // full month name

  // ---- Instagram item
  await page.getByRole('link', { name: 'Back to folder' }).click();
  await expect(page.locator('ss-item-row')).toContainText('3/3 steps');
  await page.getByRole('link', { name: 'Add', exact: true }).click();
  await page.getByLabel('Link (optional)').fill(IG);
  await expect(page.getByText('Instagram post')).toBeVisible();
  await page.getByLabel('Title').fill('Hip mobility reel');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.locator('iframe')).toHaveAttribute('src', 'https://www.instagram.com/reel/C1a2B3c4D5e/embed');
  await expect(page.getByRole('link', { name: 'Open in Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/reel/C1a2B3c4D5e/');
  await page.getByLabel('Due date').fill(todayIso());
  await addStep(page, 'Try it after the gym');

  // ---- today view
  await page.getByRole('link', { name: 'Back to folder' }).click();
  await page.getByRole('link', { name: 'Today', exact: true }).click();
  await expect(page.getByText('Hip mobility reel')).toBeVisible();     // open item due today
  await expect(page.getByText('Full body workout')).toHaveCount(0);    // done items are left out

  // ---- search + filters
  await page.getByRole('link', { name: 'Search' }).click();
  await page.getByLabel('Search your saved items').fill('after the gym'); // matches a step
  await expect(page.locator('ss-item-row')).toHaveCount(1);
  await page.getByLabel('Search your saved items').fill('');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('ss-item-row')).toHaveCount(1);
  await expect(page.locator('ss-item-row')).toContainText('Full body workout');
  await page.getByRole('button', { name: 'Job prep' }).click();
  await expect(page.getByText('Nothing found')).toBeVisible();

  // ---- fixed frame: tab bar sits below the scroller and the document never scrolls
  const m = await page.evaluate(() => {
    const nav = document.querySelector('.bottom-nav')!.getBoundingClientRect();
    const scroll = document.querySelector('.app-scroll')!.getBoundingClientRect();
    return { navBottom: nav.bottom, navTop: nav.top, scrollBottom: scroll.bottom, vh: innerHeight, docScrollable: document.documentElement.scrollHeight > innerHeight, position: getComputedStyle(document.querySelector('.bottom-nav')!).position };
  });
  expect(m.position).not.toBe('fixed');
  expect(m.scrollBottom).toBeLessThanOrEqual(m.navTop + 0.5);
  expect(Math.round(m.navBottom)).toBe(m.vh);
  expect(m.docScrollable).toBe(false);

  // ---- persistence: reload keeps the login and the data
  await page.reload();
  await page.getByRole('link', { name: 'Search' }).click();
  await expect(page.locator('ss-item-row')).toHaveCount(2);

  // ---- delete folder removes its items (with confirmation), then log out
  await page.getByRole('link', { name: 'Folders' }).click();
  await page.getByRole('button', { name: 'Edit folders' }).click();
  await page.getByRole('button', { name: 'Delete folder' }).nth(1).click(); // Gym
  await expect(page.getByRole('alertdialog')).toContainText('2 saved items');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect.poll(() => fake.tables.ss_items.length).toBe(0);
  expect(fake.tables.ss_subtasks).toHaveLength(0);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('link', { name: 'More' }).click();
  await expect(page.getByText('sakshi@example.com')).toBeVisible();
  await expect(page.getByText('Share')).toBeVisible(); // install steps are shown
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);

  expect(errors).toEqual([]);
});
