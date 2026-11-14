import { supabase } from './supabase';
import { t } from './i18n';
import { installStepsText } from './installText';

export interface Invite { email: string; note: string | null; invited_at: string; joined: boolean; joined_at: string | null }

/** Owner-only actions. The database checks is_admin on every call, so hiding the screen is not the only guard. */
export const admin = {
  async list(): Promise<Invite[]> {
    const { data, error } = await supabase.rpc('admin_list_invites');
    if (error) throw new Error(friendly(error.message));
    return (Array.isArray(data) ? data : []) as Invite[];
  },
  async invite(email: string, note?: string): Promise<string> {
    const { data, error } = await supabase.rpc('admin_invite', { p_email: email, p_note: note ?? null });
    if (error) throw new Error(friendly(error.message));
    return data as string;
  },
  async remove(email: string) {
    const { error } = await supabase.rpc('admin_remove_invite', { p_email: email });
    if (error) throw new Error(friendly(error.message));
  },
};

function friendly(msg: string) {
  if (/BAD_EMAIL/.test(msg)) return t('That doesn’t look like an email address');
  if (/NOT_ADMIN/.test(msg)) return t('Only the app owner can do this');
  if (/CANNOT_REMOVE_ADMIN/.test(msg)) return t('You can’t remove the owner');
  if (/admin_|function/.test(msg)) return t('Invites need a one-time database update first');
  return t('Something went wrong. Check your connection');
}

export const APP_URL = 'https://daily-assistant-eta.vercel.app';

/** Message the owner sends to someone they invited (WhatsApp / share sheet), with the exact install steps. */
export const inviteMessage = (email: string) =>
  `${t("I've added you to Daily Assistant. It's a free app for medicine and habit reminders.")}\n\n` +
  `${t('Step 1: open this link on your phone:')}\n${APP_URL}/about\n\n` +
  `${t('Step 2: add it to your Home Screen.')}\n${installStepsText()}\n\n` +
  `${t('Step 3: log in with {email}. You will get a 6-digit code by email (check Spam if it is not there).', { email })}`;
