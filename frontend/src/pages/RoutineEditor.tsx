import { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, ChevronUp, ChevronDown, Trash2, Plus, Edit2, Power, PowerOff } from 'lucide-react';
import toast from 'react-hot-toast';
import CategoryIcon from '../components/ui/CategoryIcon';
import { Skeleton } from '../components/ui/Skeleton';
import { confirmDialog } from '../components/ui/ConfirmDialog';
import RemindAgainField, { initialRemindAgain } from '../components/RemindAgainField';
import { useApp } from '../context/AppContext';
import { CATEGORIES, DAYS_SHORT } from '../utils/constants';
import { doseMeta } from '../utils/dose';
import { formatTime } from '../utils/dateHelpers';
import { routinesOf, newRoutineId, type Routine } from '../lib/routines';
import type { Category, MealRelation, Reminder, RepeatType } from '../types';
import { t as tr } from '../lib/i18n';

const MEAL_OPTIONS: { value: MealRelation; label: string }[] = [
  { value: 'after',       label: tr('After meal')  },
  { value: 'before',      label: tr('Before meal') },
  { value: 'with',        label: tr('With meal')   },
  { value: 'independent', label: tr('Any time')    },
];

type RepeatMode = 'daily' | 'weekdays' | 'days';
const REPEAT_MODES: { key: RepeatMode; label: string }[] = [
  { key: 'daily', label: tr('Every day') }, { key: 'weekdays', label: tr('Weekdays') }, { key: 'days', label: tr('Some days') },
];

/** One row of the routine while it is being edited. `id` is set for items that are already saved reminders. */
interface Item { key: string; id?: string; title: string; category: Category; dosage: string; meal: MealRelation }
const blankItem = (): Item => ({ key: `n-${Math.random().toString(36).slice(2, 9)}`, title: '', category: 'habit', dosage: '', meal: 'after' });
const reminderId = () => `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Add or edit a routine: a named group of reminders with its own time, days and ONE notification. */
export default function RoutineEditor() {
  const { id } = useParams<{ id: string }>();
  const { reminders, fresh } = useApp();
  const routine = id ? routinesOf(reminders).find(r => r.id === id) : undefined;
  if (id && !routine) {
    if (fresh) return <Navigate to="/reminders" replace />;   // deleted or never existed
    return (
      <div className="page pt-4" role="status" aria-label="Loading routine">
        <Skeleton className="w-10 h-10 rounded-xl mb-6" />
        <Skeleton className="h-3 w-16 mb-2" /><Skeleton className="h-12 w-full rounded-2xl mb-5" />
        <Skeleton className="h-3 w-16 mb-2" /><Skeleton className="h-12 w-full rounded-2xl mb-5" />
        <Skeleton className="h-3 w-16 mb-2" /><Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }
  return <RoutineForm key={id ?? 'new'} routine={routine} />;
}

function RoutineForm({ routine }: { routine?: Routine }) {
  const navigate = useNavigate();
  const { reminders, setReminders, refreshToday, profile } = useApp();
  const isEdit = !!routine;

  const [name, setName] = useState(routine?.name ?? '');
  const [time, setTime] = useState(routine?.time ?? '07:00');
  const [mode, setMode] = useState<RepeatMode>(
    routine?.repeat === 'weekdays' ? 'weekdays' : routine?.repeat === 'weekly' || routine?.repeat === 'custom' ? 'days' : 'daily');
  const [weekDays, setWeekDays] = useState<number[]>(
    routine?.repeat === 'weekly' || routine?.repeat === 'custom' ? [...(routine.repeatDays ?? [])].sort((a, b) => a - b) : []);
  const [again, setAgain] = useState(() => initialRemindAgain(routine?.remindAgain, profile.follow_up_minutes ?? 15, !routine));
  const [active, setActive] = useState(routine?.isActive ?? true);
  const [items, setItems] = useState<Item[]>(() => (routine?.items ?? []).map(r => ({
    key: r.id, id: r.id, title: r.title, category: r.category, dosage: r.medicine?.dosage ?? '', meal: r.medicine?.mealRelation ?? 'after',
  })));
  // The item form: a new item, or the row being changed (`editing` = its key).
  const [draft, setDraft] = useState<Item | null>(routine ? null : blankItem());
  const [editing, setEditing] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const existingById = new Map(reminders.map(r => [r.id, r]));

  const toggleDay = (d: number) => {
    setWeekDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b));
    setErrors(e => ({ ...e, repeat: '' }));
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };

  const startAdd = () => { setDraft(blankItem()); setEditing(null); setErrors(e => ({ ...e, items: '', item: '' })); };
  const startEdit = (it: Item) => { setDraft({ ...it }); setEditing(it.key); setErrors(e => ({ ...e, item: '' })); };
  const closeDraft = () => { setDraft(null); setEditing(null); setErrors(e => ({ ...e, item: '' })); };

  /** Put the item form into the list. Returns the new list, or null when the name is missing. */
  const commitDraft = (list: Item[]): Item[] | null => {
    if (!draft) return list;
    const title = draft.title.trim();
    if (!title) return null;
    const clean = { ...draft, title, dosage: draft.dosage.trim() };
    return editing ? list.map(it => (it.key === editing ? clean : it)) : [...list, clean];
  };
  const saveItem = () => {
    const next = commitDraft(items);
    if (!next) { setErrors(e => ({ ...e, item: tr('Please enter the item name') })); return; }
    setItems(next);
    setErrors(e => ({ ...e, items: '', item: '' }));
    if (editing) closeDraft(); else { setDraft(blankItem()); setEditing(null); }   // ready for the next item
  };

  /** Validate and save every item of the routine in one go. Returns the saved members, or null if something is missing. */
  const save = (): Reminder[] | null => {
    // A half-typed item is added too; an empty item form is simply ignored.
    const list = draft && draft.title.trim() ? commitDraft(items)! : items;
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = tr('Please give the routine a name');
    if (mode === 'days' && weekDays.length === 0) errs.repeat = tr('Pick at least one day of the week');
    if (list.length === 0) errs.items = tr('Add at least one item');
    setErrors(errs);
    const first = ['name', 'repeat', 'items'].find(k => errs[k]);
    if (first) {
      setTimeout(() => document.getElementById(`field-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return null;
    }
    const repeat: { repeat: RepeatType; repeatDays?: number[] } =
      mode === 'weekdays' || (mode === 'days' && weekDays.join() === '0,1,2,3,4') ? { repeat: 'weekdays' }
      : mode === 'days' && weekDays.length < 7 ? { repeat: 'weekly', repeatDays: weekDays } : { repeat: 'daily' };
    const routineId = routine?.id ?? newRoutineId();
    const now = new Date().toISOString();
    const members: Reminder[] = list.map((it, i) => {
      const old = it.id ? existingById.get(it.id) : undefined;
      return {
        id: old?.id ?? reminderId(),
        title: it.title,
        description: old?.description,
        category: it.category,
        slots: [],
        customTime: time,
        repeat: repeat.repeat,
        repeatDays: repeat.repeatDays,
        isActive: active,
        createdAt: old?.createdAt ?? now,
        remindAgain: again.on ? { every: again.every, times: again.times } : { every: 0, times: 1 },
        routineId, routineName: name.trim(), routineOrder: i,
        // Medicines keep their stock and course settings; only the dose and meal are edited here.
        ...(it.category === 'medicine' && {
          medicine: { ...old?.medicine, asNeeded: undefined, dosage: it.dosage || undefined, mealRelation: it.meal },
        }),
      };
    });
    // One update: changed items are replaced, new ones added, removed ones deleted.
    setReminders(prev => [...prev.filter(r => r.routineId !== routineId), ...members]);
    refreshToday();
    return members;
  };

  const handleSave = () => {
    if (saving) return;
    if (!save()) return;
    setSaving(true);
    toast.success(isEdit ? tr('Routine updated') : tr('Routine added'));
    navigate('/reminders');
  };

  /** Stock and course live on the medicine's own screen: save the routine first, then open it. */
  const openMedicine = (it: Item) => {
    const members = save();
    if (!members) return;
    const m = members.find(r => r.id === it.id);
    if (m) navigate(`/reminders/edit/${m.id}`);
  };

  const deleteRoutine = async () => {
    if (!routine) return;
    const ok = await confirmDialog({
      title: tr('Delete the routine "{name}"?', { name: routine.name }),
      message: tr(routine.items.length === 1 ? 'Its 1 item will stop reminding you. Your past history stays in Progress.' : 'All {n} items in it will stop reminding you. Your past history stays in Progress.', { n: routine.items.length }),
      confirmText: tr('Delete routine'), tone: 'danger',
    });
    if (!ok) return;
    setReminders(prev => prev.filter(r => r.routineId !== routine.id));
    refreshToday();
    toast.success(tr('Routine deleted'));
    navigate('/reminders');
  };

  const repeatText = mode === 'daily' ? tr('Every day') : mode === 'weekdays' ? tr('Every weekday (Mon-Fri)')
    : weekDays.length ? weekDays.map(i => DAYS_SHORT[i]).join(', ') : tr('Pick the days below');

  return (
    <div className="page pt-4 pb-0">
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn-icon" aria-label={tr('Back')}><ArrowLeft size={20} /></button>
        <h1 className="page-title">{isEdit ? tr('Edit routine') : tr('Add routine')}</h1>
      </div>

      {!isEdit && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          {tr('Put several things in one group, like your morning. You get one notification for all of them and tick them together.')}
        </p>
      )}

      {/* Name */}
      <div className="form-group" id="field-name">
        <label className="label" htmlFor="routine-name">{tr('Routine name')}</label>
        <input id="routine-name" className={`input ${errors.name ? 'border-red-400 dark:border-red-500' : ''}`} placeholder={tr('e.g. Morning routine')}
          value={name} maxLength={60} onChange={e => { setName(e.target.value); setErrors(er => ({ ...er, name: '' })); }} />
        {errors.name && <p className="text-xs text-red-500 mt-1.5">{errors.name}</p>}
      </div>

      {/* Time */}
      <div className="form-group">
        <label className="label" htmlFor="routine-time">{tr('Time')}</label>
        <input id="routine-time" type="time" className="input" value={time} onChange={e => setTime(e.target.value || '07:00')} />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{tr('One notification at this time lists every item.')}</p>
      </div>

      {/* Repeat */}
      <div className="form-group" id="field-repeat">
        <div className="flex items-baseline justify-between gap-3 mb-1.5">
          <label className="label mb-0">{tr('Repeat')}</label>
          <span className={`text-xs font-medium text-right ${errors.repeat ? 'text-red-500' : 'text-brand-600 dark:text-brand-400'}`}>
            {errors.repeat || repeatText}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-gray-100 dark:bg-[#2C2C2E]">
          {REPEAT_MODES.map(m => (
            <button key={m.key} type="button" onClick={() => { setMode(m.key); setErrors(e => ({ ...e, repeat: '' })); }} aria-pressed={mode === m.key}
              className={`py-2 px-1 rounded-lg text-[13px] font-medium transition-all ${
                mode === m.key ? 'bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              {m.label}
            </button>
          ))}
        </div>
        {mode === 'days' && (
          <div className="card p-3 mt-3">
            <div className="flex justify-between">
              {DAYS_SHORT.map((d, i) => (
                <button key={d} type="button" onClick={() => toggleDay(i)} aria-pressed={weekDays.includes(i)}
                  className={`w-11 h-11 rounded-full text-xs font-semibold transition-all ${
                    weekDays.includes(i) ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-500 dark:text-gray-400'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="form-group" id="field-items">
        <div className="flex items-baseline justify-between mb-1.5">
          <label className="label mb-0">{tr('Items')}</label>
          <span className={`text-xs font-medium ${errors.items ? 'text-red-500' : 'text-brand-600 dark:text-brand-400'}`}>
            {errors.items || tr(items.length === 1 ? '1 item' : '{n} items', { n: items.length })}
          </span>
        </div>

        {items.length > 0 && (
          <div className="card divide-y divide-gray-100 dark:divide-[#2C2C2E] overflow-hidden mb-3">
            {items.map((it, i) => {
              const cat = CATEGORIES[it.category];
              const meta = it.category === 'medicine'
                ? doseMeta({ category: 'medicine', medicine: { dosage: it.dosage || undefined, mealRelation: it.meal } } as Reminder) : '';
              return (
                <div key={it.key} className={`flex items-center gap-2 px-3 py-2.5 ${editing === it.key ? 'bg-brand-50 dark:bg-white/[0.04]' : ''}`}>
                  <div className="flex flex-col flex-shrink-0">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-0.5 text-gray-400 disabled:opacity-20" aria-label={tr('Move up')}><ChevronUp size={16} /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="p-0.5 text-gray-400 disabled:opacity-20" aria-label={tr('Move down')}><ChevronDown size={16} /></button>
                  </div>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cat.bg, color: cat.color }}>
                    <CategoryIcon category={it.category} size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 break-words">{it.title}</p>
                    <p className="text-xs text-gray-400 truncate">{meta || cat.label}</p>
                    {it.category === 'medicine' && it.id && (
                      <button type="button" onClick={() => openMedicine(it)} className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 mt-0.5 text-left">
                        {tr('Refill alert and course')}
                      </button>
                    )}
                  </div>
                  <button type="button" onClick={() => startEdit(it)} className="p-2 text-gray-400 flex-shrink-0" aria-label={tr('Edit {title}', { title: it.title })}><Edit2 size={15} /></button>
                  <button type="button" onClick={() => { setItems(items.filter(x => x.key !== it.key)); if (editing === it.key) closeDraft(); }}
                    className="p-2 text-gray-400 hover:text-red-500 flex-shrink-0" aria-label={tr('Remove {title}', { title: it.title })}><Trash2 size={15} /></button>
                </div>
              );
            })}
          </div>
        )}

        {draft ? (
          <div className="card p-3 space-y-3">
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block" htmlFor="item-title">{editing ? tr('Change item') : tr('New item')}</label>
              <input id="item-title" className={`input ${errors.item ? 'border-red-400 dark:border-red-500' : ''}`} placeholder={tr('e.g. Drink hot water')}
                value={draft.title} maxLength={80}
                onChange={e => { setDraft({ ...draft, title: e.target.value }); setErrors(er => ({ ...er, item: '', items: '' })); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveItem(); } }} />
              {errors.item && <p className="text-xs text-red-500 mt-1.5">{errors.item}</p>}
            </div>
            <div>
              <label className="text-[11px] text-gray-400 mb-1 block">{tr('Type')}</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(CATEGORIES) as [Category, typeof CATEGORIES[Category]][]).map(([k, c]) => (
                  <button key={k} type="button" onClick={() => setDraft({ ...draft, category: k })} aria-pressed={draft.category === k}
                    className={`px-3 py-2 rounded-xl border-2 flex items-center gap-2 text-left transition-all ${
                      draft.category === k ? 'border-brand-500 bg-brand-50 dark:bg-white/[0.06]' : 'border-gray-200 dark:border-[#2C2C2E]'}`}>
                    <span style={{ color: c.color }}><CategoryIcon category={k} size={16} /></span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-0">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {draft.category === 'medicine' && (
              <>
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block" htmlFor="item-dose">{tr('Dose')}</label>
                  <input id="item-dose" className="input" placeholder={tr('e.g. 10 ml or 1 tablet')} value={draft.dosage} maxLength={40}
                    onChange={e => setDraft({ ...draft, dosage: e.target.value })} />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block">{tr('Meal')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {MEAL_OPTIONS.map(o => (
                      <button key={o.value} type="button" onClick={() => setDraft({ ...draft, meal: o.value })} aria-pressed={draft.meal === o.value}
                        className={`p-2.5 rounded-xl border text-sm font-medium transition-all ${
                          draft.meal === o.value ? 'border-brand-500 bg-brand-50 dark:bg-white/[0.06] text-brand-600 dark:text-brand-400'
                          : 'border-gray-200 dark:border-[#2C2C2E] text-gray-500 dark:text-gray-400'}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={saveItem} className="btn-secondary flex-1 py-2.5 text-brand-700 dark:text-brand-300">
                <Plus size={16} /> {editing ? tr('Save item') : tr('Add item')}
              </button>
              {(items.length > 0 || editing) && (
                <button type="button" onClick={closeDraft} className="btn px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">{tr('Cancel')}</button>
              )}
            </div>
          </div>
        ) : (
          <button type="button" onClick={startAdd}
            className="w-full p-2.5 rounded-xl border border-dashed border-gray-300 dark:border-[#3A3A3C] text-sm font-medium text-brand-600 dark:text-brand-400 flex items-center justify-center gap-2">
            <Plus size={16} /> {tr('Add item')}
          </button>
        )}
      </div>

      {/* Remind me again: one setting for the whole routine */}
      <RemindAgainField on={again.on} every={again.every} times={again.times} onChange={setAgain} />

      {isEdit && (
        <div className="form-group space-y-2">
          <button type="button" onClick={() => setActive(v => !v)} aria-pressed={!active}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-[#3A3A3C] bg-white dark:bg-[#1C1C1E] text-left">
            <span className={active ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>{active ? <Power size={18} /> : <PowerOff size={18} />}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">{active ? tr('Routine is on') : tr('Routine is paused')}</span>
              <span className="block text-xs text-gray-400">{active ? tr('Tap to pause all its reminders') : tr('Tap to turn it back on')}</span>
            </span>
          </button>
          <button type="button" onClick={deleteRoutine}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10">
            <Trash2 size={16} /> {tr('Delete routine')}
          </button>
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 px-4 pt-3 mt-2 bg-cream dark:bg-[#0E0E10]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <button onClick={handleSave} disabled={saving} className="btn-primary w-full disabled:opacity-60">
          {isEdit ? tr('Save routine') : tr('Add routine')}
        </button>
        <p className="text-[11px] text-center text-gray-400 mt-2">
          {name.trim() || tr('Routine')} · {formatTime(time)}
        </p>
      </div>
    </div>
  );
}
