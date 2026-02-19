import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, X, ChevronDown } from 'lucide-react';
import { getPricingRules, createPricingRule, updatePricingRule, deletePricingRule } from '../services/pricingService';
import type { PricingRule } from '../types';

// ─── Rule type metadata ────────────────────────────────────────────────────────

const RULE_TYPES = ['DAY_TYPE', 'POPULARITY', 'SEAT_CATEGORY', 'DEMAND_SURGE', 'FLAT_DISCOUNT'] as const;

const RULE_TYPE_LABELS: Record<string, string> = {
    DAY_TYPE: 'Day of Week',
    POPULARITY: 'Movie Popularity',
    SEAT_CATEGORY: 'Seat Category',
    DEMAND_SURGE: 'Demand Surge',
    FLAT_DISCOUNT: 'Flat Discount (always on)',
};

const RULE_TYPE_DESCRIPTIONS: Record<string, string> = {
    DAY_TYPE: 'Applies on selected days of the week (e.g. weekends).',
    POPULARITY: 'Applies when the movie\'s popularity score meets the threshold.',
    SEAT_CATEGORY: 'Applies only to a specific seat type (e.g. Premium).',
    DEMAND_SURGE: 'Applies automatically when the showtime occupancy exceeds its threshold.',
    FLAT_DISCOUNT: 'Always applies — useful for platform-wide promos.',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Condition builder ─────────────────────────────────────────────────────────

/** Build the condition JSON from the friendly UI state */
function buildCondition(ruleType: PricingRule['ruleType'], ui: ConditionUI): Record<string, unknown> {
    switch (ruleType) {
        case 'DAY_TYPE':
            return { days: ui.days };
        case 'POPULARITY':
            return { minScore: ui.minScore };
        case 'SEAT_CATEGORY':
            return { category: ui.category };
        case 'DEMAND_SURGE':
        case 'FLAT_DISCOUNT':
        default:
            return {};
    }
}

/** Parse stored condition JSON back into friendly UI state */
function parseCondition(_ruleType: PricingRule['ruleType'], condition: Record<string, unknown>): ConditionUI {
    return {
        days: (condition.days as number[]) ?? [],
        minScore: (condition.minScore as number) ?? 50,
        category: (condition.category as string) ?? '',
    };
}

interface ConditionUI {
    days: number[];       // DAY_TYPE
    minScore: number;     // POPULARITY
    category: string;     // SEAT_CATEGORY
}

const DEFAULT_CONDITION_UI: ConditionUI = { days: [], minScore: 50, category: '' };

// ─── Empty form ────────────────────────────────────────────────────────────────

const EMPTY_RULE: Partial<PricingRule> = {
    name: '',
    ruleType: 'DAY_TYPE',
    condition: {},
    multiplier: null,
    flatDiscount: null,
    priority: 10,
    isActive: true,
    validFrom: null,
    validUntil: null,
};

// ─── Component ─────────────────────────────────────────────────────────────────

interface Props { compact?: boolean; }

const PricingRuleManager: React.FC<Props> = ({ compact = false }) => {
    const [rules, setRules] = useState<PricingRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<PricingRule | null>(null);
    const [form, setForm] = useState<Partial<PricingRule>>(EMPTY_RULE);
    const [condUI, setCondUI] = useState<ConditionUI>(DEFAULT_CONDITION_UI);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const load = async () => {
        setLoading(true);
        try { setRules(await getPricingRules()); }
        catch { setError('Failed to load pricing rules.'); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    // ── Form open/close ────────────────────────────────────────────────────────

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_RULE);
        setCondUI(DEFAULT_CONDITION_UI);
        setError('');
        setShowForm(true);
    };

    const openEdit = (rule: PricingRule) => {
        setEditing(rule);
        setForm({ ...rule });
        setCondUI(parseCondition(rule.ruleType, rule.condition));
        setError('');
        setShowForm(true);
    };

    /** When rule type changes, reset the condition UI to defaults */
    const handleRuleTypeChange = (ruleType: PricingRule['ruleType']) => {
        setForm(f => ({ ...f, ruleType }));
        setCondUI(DEFAULT_CONDITION_UI);
    };

    // ── Submit ─────────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (!form.name?.trim()) { setError('Rule name is required.'); return; }

        // Validate condition UI
        if (form.ruleType === 'DAY_TYPE' && condUI.days.length === 0) {
            setError('Select at least one day.'); return;
        }
        if (form.ruleType === 'SEAT_CATEGORY' && !condUI.category.trim()) {
            setError('Enter a seat category.'); return;
        }

        setSaving(true);
        setError('');
        try {
            const payload = {
                ...form,
                condition: buildCondition(form.ruleType!, condUI),
            };
            if (editing) {
                await updatePricingRule(editing.id, payload);
            } else {
                await createPricingRule(payload);
            }
            setShowForm(false);
            await load();
        } catch {
            setError('Failed to save rule.');
        } finally {
            setSaving(false);
        }
    };

    // ── List actions ───────────────────────────────────────────────────────────

    const handleToggle = async (rule: PricingRule) => {
        try {
            await updatePricingRule(rule.id, { isActive: !rule.isActive });
            setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
        } catch { setError('Failed to update rule.'); }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Delete this pricing rule?')) return;
        try {
            await deletePricingRule(id);
            setRules(prev => prev.filter(r => r.id !== id));
        } catch { setError('Failed to delete rule.'); }
    };

    // ── Condition summary for list row ─────────────────────────────────────────

    const conditionSummary = (rule: PricingRule) => {
        const c = rule.condition;
        switch (rule.ruleType) {
            case 'DAY_TYPE': {
                const days = (c.days as number[] | undefined) ?? [];
                return days.length ? days.map(d => DAYS[d]).join(', ') : 'No days';
            }
            case 'POPULARITY':
                return `Score ≥ ${c.minScore ?? '?'}`;
            case 'SEAT_CATEGORY':
                return `Category: ${c.category ?? '?'}`;
            case 'DEMAND_SURGE':
                return 'Auto (occupancy threshold)';
            case 'FLAT_DISCOUNT':
                return 'Always applies';
            default:
                return '';
        }
    };

    // ─── Render ────────────────────────────────────────────────────────────────

    const sortedRules = [...rules].sort((a, b) => a.priority - b.priority || a.id - b.id);
    const activeCount = rules.filter(r => r.isActive).length;
    const inactiveCount = rules.length - activeCount;

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {!compact && (
                    <div>
                        <h2 className="text-lg font-bold text-white">Pricing Rules</h2>
                        <p className="text-xs text-neutral-500 mt-1">Prioritized by lowest number first.</p>
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <div className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
                        {rules.length} total
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                        {activeCount} active
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400">
                        {inactiveCount} inactive
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Rule
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>
            )}

            {/* Rules List */}
            {loading ? (
                <div className="text-center py-10 text-neutral-500 text-sm">Loading rules…</div>
            ) : rules.length === 0 ? (
                <div className="text-center py-10 text-neutral-500 text-sm">No pricing rules yet. Create one to get started.</div>
            ) : (
                <div className="space-y-2">
                    {sortedRules.map(rule => (
                        <motion.div
                            key={rule.id}
                            layout
                            className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${rule.isActive
                                ? 'bg-gradient-to-r from-neutral-900 to-neutral-900/70 border-neutral-800'
                                : 'bg-neutral-900/40 border-neutral-800/40 opacity-60'
                                }`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-sm text-white truncate">{rule.name}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono uppercase">
                                        {RULE_TYPE_LABELS[rule.ruleType]}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800/60 text-neutral-500">
                                        Priority {rule.priority}
                                    </span>
                                    {rule.isActive ? (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300">
                                            Active
                                        </span>
                                    ) : (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-500">
                                            Inactive
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-neutral-500 mt-1">
                                    {conditionSummary(rule)}
                                    {' · '}
                                    {rule.multiplier != null
                                        ? `×${Number(rule.multiplier).toFixed(2)} multiplier`
                                        : rule.flatDiscount != null
                                            ? `−₹${Number(rule.flatDiscount).toFixed(2)} flat`
                                            : 'No effect set'}
                                    {rule.validFrom && ` · from ${rule.validFrom}`}
                                    {rule.validUntil && ` · until ${rule.validUntil}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 ml-3 shrink-0">
                                <button onClick={() => handleToggle(rule)} className="text-neutral-400 hover:text-white transition-colors">
                                    {rule.isActive
                                        ? <ToggleRight className="w-5 h-5 text-amber-500" />
                                        : <ToggleLeft className="w-5 h-5" />
                                    }
                                </button>
                                <button onClick={() => openEdit(rule)} className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(rule.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-400 hover:text-red-400 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* ── Form Modal ─────────────────────────────────────────────────── */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
                    >
                        <motion.div
                            initial={{ y: 40, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 40, opacity: 0 }}
                            className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden"
                        >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
                                <h3 className="font-bold text-white">{editing ? 'Edit Rule' : 'New Pricing Rule'}</h3>
                                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-full hover:bg-neutral-800">
                                    <X className="w-4 h-4 text-neutral-400" />
                                </button>
                            </div>

                            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">

                                {/* Rule Name */}
                                <div>
                                    <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5 block">Rule Name</label>
                                    <input
                                        value={form.name || ''}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="e.g. Weekend Surge"
                                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500/50"
                                    />
                                </div>

                                {/* Rule Type */}
                                <div>
                                    <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5 block">Rule Type</label>
                                    <div className="relative">
                                        <select
                                            value={form.ruleType}
                                            onChange={e => handleRuleTypeChange(e.target.value as PricingRule['ruleType'])}
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50 appearance-none"
                                        >
                                            {RULE_TYPES.map(t => (
                                                <option key={t} value={t}>{RULE_TYPE_LABELS[t]}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                                    </div>
                                    <p className="text-xs text-neutral-600 mt-1.5">{RULE_TYPE_DESCRIPTIONS[form.ruleType ?? 'DAY_TYPE']}</p>
                                </div>

                                {/* ── Contextual condition UI ────────────────────────────────── */}

                                {/* DAY_TYPE — day checkboxes */}
                                {form.ruleType === 'DAY_TYPE' && (
                                    <div>
                                        <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-2 block">Apply on these days</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {DAYS.map((day, idx) => {
                                                const selected = condUI.days.includes(idx);
                                                return (
                                                    <button
                                                        key={day}
                                                        type="button"
                                                        onClick={() => setCondUI(u => ({
                                                            ...u,
                                                            days: selected
                                                                ? u.days.filter(d => d !== idx)
                                                                : [...u.days, idx],
                                                        }))}
                                                        className={`w-12 h-10 rounded-xl text-xs font-bold transition-colors ${selected
                                                            ? 'bg-amber-500 text-white'
                                                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                                            }`}
                                                    >
                                                        {day}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-xs text-neutral-600 mt-1.5">
                                            {condUI.days.length === 0
                                                ? 'No days selected'
                                                : `Active on: ${condUI.days.sort().map(d => DAYS[d]).join(', ')}`}
                                        </p>
                                    </div>
                                )}

                                {/* POPULARITY — score slider */}
                                {form.ruleType === 'POPULARITY' && (
                                    <div>
                                        <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-2 block">
                                            Minimum Popularity Score — <span className="text-amber-400">{condUI.minScore}</span>
                                        </label>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            step={5}
                                            value={condUI.minScore}
                                            onChange={e => setCondUI(u => ({ ...u, minScore: Number(e.target.value) }))}
                                            className="w-full accent-amber-500"
                                        />
                                        <div className="flex justify-between text-[10px] text-neutral-600 mt-0.5">
                                            <span>0 (all movies)</span>
                                            <span>100 (blockbusters only)</span>
                                        </div>
                                    </div>
                                )}

                                {/* SEAT_CATEGORY — text input */}
                                {form.ruleType === 'SEAT_CATEGORY' && (
                                    <div>
                                        <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5 block">Seat Category Name</label>
                                        <input
                                            value={condUI.category}
                                            onChange={e => setCondUI(u => ({ ...u, category: e.target.value }))}
                                            placeholder="e.g. Premium, Classic, Recliner"
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500/50"
                                        />
                                        <p className="text-xs text-neutral-600 mt-1">Must match the seat type name exactly (case-insensitive).</p>
                                    </div>
                                )}

                                {/* DEMAND_SURGE / FLAT_DISCOUNT — no condition needed */}
                                {(form.ruleType === 'DEMAND_SURGE' || form.ruleType === 'FLAT_DISCOUNT') && (
                                    <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl px-4 py-3 text-xs text-neutral-500">
                                        {form.ruleType === 'DEMAND_SURGE'
                                            ? '⚡ No configuration needed. This rule fires automatically when a showtime\'s seat occupancy exceeds its configured threshold.'
                                            : '🏷️ No configuration needed. This rule always applies to every booking during the validity period.'}
                                    </div>
                                )}

                                {/* ── Effect ──────────────────────────────────────────────────── */}
                                <div>
                                    <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-2 block">Price Effect</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[10px] text-neutral-600 mb-1">Multiplier (e.g. 1.20 = +20%)</p>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder="e.g. 1.20"
                                                value={form.multiplier ?? ''}
                                                onChange={e => setForm(f => ({ ...f, multiplier: e.target.value ? Number(e.target.value) : null, flatDiscount: null }))}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500/50"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-neutral-600 mb-1">Flat Discount (₹ off)</p>
                                            <input
                                                type="number"
                                                step="1"
                                                min="0"
                                                placeholder="e.g. 50"
                                                value={form.flatDiscount ?? ''}
                                                onChange={e => setForm(f => ({ ...f, flatDiscount: e.target.value ? Number(e.target.value) : null, multiplier: null }))}
                                                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-amber-500/50"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-neutral-600 mt-1">Fill only one. Multiplier takes precedence if both are set.</p>
                                </div>

                                {/* Priority & Active */}
                                <div className="grid grid-cols-2 gap-3 items-end">
                                    <div>
                                        <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5 block">Priority</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={form.priority ?? 10}
                                            onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                                        />
                                        <p className="text-[10px] text-neutral-600 mt-1">Lower number = applied first.</p>
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer pb-2.5">
                                        <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Active</span>
                                        <div
                                            onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                                            className={`relative w-10 h-6 rounded-full transition-colors ${form.isActive ? 'bg-amber-500' : 'bg-neutral-700'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </div>
                                    </label>
                                </div>

                                {/* Validity dates */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5 block">Valid From</label>
                                        <input
                                            type="date"
                                            value={form.validFrom ?? ''}
                                            onChange={e => setForm(f => ({ ...f, validFrom: e.target.value || null }))}
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-1.5 block">Valid Until</label>
                                        <input
                                            type="date"
                                            value={form.validUntil ?? ''}
                                            onChange={e => setForm(f => ({ ...f, validUntil: e.target.value || null }))}
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                                        />
                                    </div>
                                </div>

                                {error && <p className="text-sm text-red-400">{error}</p>}
                            </div>

                            <div className="px-5 py-4 border-t border-neutral-800 flex gap-3">
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 h-11 rounded-xl bg-neutral-800 text-neutral-300 font-semibold text-sm hover:bg-neutral-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={saving}
                                    className="flex-1 h-11 rounded-xl bg-amber-500 text-white font-bold text-sm disabled:opacity-50 hover:bg-amber-600 transition-colors"
                                >
                                    {saving ? 'Saving…' : editing ? 'Update Rule' : 'Create Rule'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PricingRuleManager;
