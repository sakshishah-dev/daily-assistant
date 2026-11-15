import { t as tr } from '../lib/i18n';

export const AGAIN_EVERY = [5, 10, 15, 30];
export const AGAIN_TIMES = [1, 2, 3];

/** Starting values for the control: the reminder's own setting, else the Settings default. */
export function initialRemindAgain(own: { every: number; times: number } | undefined, defaultEvery: number, isNew: boolean) {
  const init = own ?? (defaultEvery > 0 ? { every: defaultEvery, times: isNew ? 2 : 1 } : { every: 0, times: 1 });
  return {
    on: init.every > 0,
    every: init.every > 0 && AGAIN_EVERY.includes(init.every) ? init.every : 15,
    times: Math.min(Math.max(init.times, 1), 3),
  };
}

/** "Remind me again" (alarm-style): on/off, every N minutes, how many times. Used by reminders and routines. */
export default function RemindAgainField({ on, every, times, onChange }: {
  on: boolean; every: number; times: number;
  onChange: (v: { on: boolean; every: number; times: number }) => void;
}) {
  return (
    <div className="form-group">
      <button type="button" onClick={() => onChange({ on: !on, every, times })} aria-pressed={on}
        className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-[#3A3A3C] bg-white dark:bg-[#1C1C1E]">
        <span className="text-left">
          <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">{tr('Remind me again')}</span>
          <span className="block text-xs text-gray-400">
            {on ? tr(times > 1 ? 'Every {n} min, {times} more times' : 'Every {n} min, 1 more time', { n: every, times }) : tr('Off')}
          </span>
        </span>
        <span className={`w-11 h-6 rounded-full p-0.5 transition-colors flex-shrink-0 ${on ? 'bg-brand-600' : 'bg-gray-300 dark:bg-[#3A3A3C]'}`}>
          <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
        </span>
      </button>
      {on && (
        <div className="card p-3 mt-2 space-y-3">
          <div>
            <label className="text-[11px] text-gray-400 mb-1 block">{tr('Every')}</label>
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#2C2C2E]">
              {AGAIN_EVERY.map(m => (
                <button key={m} type="button" onClick={() => onChange({ on, every: m, times })}
                  className={`py-2 rounded-lg text-[13px] font-medium ${every === m ? 'bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                  {tr('{n} min', { n: m })}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-gray-400 mb-1 block">{tr('How many times')}</label>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#2C2C2E]">
              {AGAIN_TIMES.map(n => (
                <button key={n} type="button" onClick={() => onChange({ on, every, times: n })}
                  className={`py-2 rounded-lg text-[13px] font-medium ${times === n ? 'bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                  {n}×
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-gray-400">{tr('Stops when you tick it or snooze.')}</p>
        </div>
      )}
    </div>
  );
}
