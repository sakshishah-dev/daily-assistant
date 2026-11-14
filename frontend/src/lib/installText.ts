import { t } from './i18n';

/** Plain-text "add to Home Screen" steps for WhatsApp messages: exact steps for iPhone and for Android. */
export const installStepsText = () => [
  t('iPhone (use Safari, not Chrome or the WhatsApp browser):'),
  `1. ${t('Tap the Share button (square with an arrow pointing up) at the bottom.')}`,
  `2. ${t('Scroll down and tap "Add to Home Screen", then tap "Add".')}`,
  `3. ${t('Open Daily Assistant from the new icon on your Home Screen.')}`,
  '',
  t('Android (use Chrome):'),
  `1. ${t('Tap the three dots menu at the top right.')}`,
  `2. ${t('Tap "Install app" (or "Add to Home screen"), then tap "Install".')}`,
  `3. ${t('Open Daily Assistant from the new icon on your Home Screen.')}`,
].join('\n');
