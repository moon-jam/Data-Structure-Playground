import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Trophy, Sparkles, ChevronLeft, Trash2, ChevronDown, ChevronRight, Lock
} from 'lucide-react';
import { SimpleMarkdown } from '../SimpleMarkdown';
import type { Lesson } from './types';

interface TutorialViewProps<T> {
    // State from useTutorial
    view: 'menu' | 'lesson';
    setView: (v: 'menu' | 'lesson') => void;
    lessonIndex: number;
    currentLesson: Lesson<T>;
    maxUnlocked: number;
    manifest: Lesson<T>[];
    completedLessons: string[]; // NEW: List of completed lesson IDs

    // Actions
    runLesson: (idx: number) => void;
    resetProgress: () => void;
    completeLesson: (lessonId?: string) => void; // NEW: To manually complete concept lessons

    // Quiz State
    quizInput: string;
    setQuizInput: (s: string) => void;
    checkQuiz: () => void;
    quizFeedback: 'correct' | 'wrong' | null;

    // UI Config
    i18nNamespace: string; // e.g. 'rbtree'
    onFinish: () => void; // Called when "Finish" button is clicked (e.g. show Congrats modal)
    renderExtraContent?: () => React.ReactNode; // For dynamic hints (violations, advice)
}

// Phase Configuration
const PHASE_CONFIG = [
    { id: 1, nameKey: 'phase1', icon: '📚' },
    { id: 2, nameKey: 'phase2', icon: '➕' },
    { id: 3, nameKey: 'phase3', icon: '➖' },
    { id: 4, nameKey: 'phase4', icon: '🎓' },
];

export function TutorialView<T>({
    view, setView, lessonIndex, currentLesson, maxUnlocked, manifest, completedLessons,
    runLesson, resetProgress, completeLesson,
    quizInput, setQuizInput, checkQuiz, quizFeedback,
    i18nNamespace, onFinish, renderExtraContent
}: TutorialViewProps<T>) {
    const { t } = useTranslation([i18nNamespace, 'common']);
    const [resetConfirm, setResetConfirm] = useState(false);
    const [expandedPhases, setExpandedPhases] = useState<number[]>([1]); // Phase 1 expanded by default

    // Group lessons by phase
    const lessonsByPhase = useMemo(() => {
        const grouped: Record<number, { lesson: Lesson<T>, idx: number }[]> = { 1: [], 2: [], 3: [], 4: [] };
        manifest.forEach((l, idx) => {
            const phase = l.phase || 1;
            grouped[phase].push({ lesson: l, idx });
        });
        return grouped;
    }, [manifest]);

    // Check if a lesson is unlocked
    const isLessonUnlocked = (lesson: Lesson<T>, idx: number) => {
        // Use unlockCondition if defined
        if (lesson.unlockCondition) {
            return lesson.unlockCondition(completedLessons);
        }
        // Fallback to sequential unlock
        return idx <= maxUnlocked;
    };

    // Check if a phase is unlocked (at least one lesson in it is unlocked)
    const isPhaseUnlocked = (phaseId: number) => {
        const lessons = lessonsByPhase[phaseId] || [];
        return lessons.some(({ lesson, idx }) => isLessonUnlocked(lesson, idx));
    };

    // Toggle phase expansion
    const togglePhase = (phaseId: number) => {
        setExpandedPhases(prev =>
            prev.includes(phaseId) ? prev.filter(p => p !== phaseId) : [...prev, phaseId]
        );
    };



    if (view === 'menu') {
        return (
            <div className="space-y-3 animate-in fade-in">
                <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                    <h3 className="text-white font-bold mb-1 text-sm">{t(`${i18nNamespace}:tutorial.title`)}</h3>
                    <p className="text-[10px] text-slate-400">{t(`${i18nNamespace}:tutorial.welcome`)}</p>
                </div>

                {/* Phase Sections */}
                {PHASE_CONFIG.map(phase => {
                    const lessons = lessonsByPhase[phase.id] || [];
                    const phaseUnlocked = isPhaseUnlocked(phase.id);
                    const isExpanded = expandedPhases.includes(phase.id);
                    const completedInPhase = lessons.filter(({ lesson }) => completedLessons.includes(lesson.id)).length;

                    return (
                        <div key={phase.id} className={`border rounded-xl overflow-hidden ${phaseUnlocked ? 'border-slate-700' : 'border-slate-800 opacity-60'}`}>
                            {/* Phase Header */}
                            <button
                                onClick={() => togglePhase(phase.id)}
                                disabled={!phaseUnlocked}
                                className={`w-full flex items-center justify-between p-3 transition-colors ${phaseUnlocked ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-900 cursor-not-allowed'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <span>{phase.icon}</span>
                                    <span className={`text-xs font-bold uppercase ${phaseUnlocked ? 'text-white' : 'text-slate-600'}`}>
                                        {t(`${i18nNamespace}:tutorial.phases.${phase.nameKey}`)}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                        ({completedInPhase}/{lessons.length})
                                    </span>
                                </div>
                                {phaseUnlocked ? (
                                    isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />
                                ) : (
                                    <Lock size={12} className="text-slate-600" />
                                )}
                            </button>

                            {/* Phase Lessons */}
                            {isExpanded && phaseUnlocked && (
                                <div className="p-2 bg-slate-900/50 grid grid-cols-2 gap-2">
                                    {lessons.map(({ lesson, idx }) => {
                                        const isUnlocked = isLessonUnlocked(lesson, idx);
                                        const isCompleted = completedLessons.includes(lesson.id);
                                        return (
                                            <button
                                                key={lesson.id}
                                                onClick={() => isUnlocked && runLesson(idx)}
                                                disabled={!isUnlocked}
                                                className={`p-2 rounded-lg border text-left transition-all ${!isUnlocked
                                                    ? 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed'
                                                    : isCompleted
                                                        ? 'bg-green-900/20 border-green-700/50 hover:bg-green-900/30'
                                                        : 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-blue-500/50'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`text-[9px] font-black uppercase px-1 py-0.5 rounded ${!isUnlocked ? 'bg-slate-800 text-slate-600' :
                                                        isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-blue-600 text-white'
                                                        }`}>
                                                        {lesson.type === 'concept' ? '📖' : lesson.type === 'quiz' ? '❓' : lesson.type === 'challenge' ? '⚡' : '🎯'}
                                                    </span>
                                                    {isCompleted && <Trophy size={12} className="text-green-500" />}
                                                    {!isUnlocked && <span className="text-slate-600 text-[10px]">🔒</span>}
                                                </div>
                                                <div className={`text-[10px] font-bold leading-tight ${!isUnlocked ? 'text-slate-600' : 'text-slate-300'}`}>
                                                    {t(`${i18nNamespace}:tutorial.levels.${lesson.id}.title`)}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}

                {completedLessons.length > 0 && (
                    <button
                        onClick={() => {
                            if (!resetConfirm) {
                                setResetConfirm(true);
                                setTimeout(() => setResetConfirm(false), 3000);
                                return;
                            }
                            resetProgress();
                            setResetConfirm(false);
                        }}
                        className={`w-full py-2 mt-2 text-[10px] font-bold rounded-xl transition-colors uppercase tracking-widest flex items-center justify-center gap-2 border ${resetConfirm
                            ? 'bg-red-600 border-red-600 text-white animate-pulse'
                            : 'border-transparent text-red-400 hover:text-red-300 hover:bg-red-900/20 hover:border-red-900/30'
                            }`}
                    >
                        <Trash2 size={12} /> {resetConfirm ? 'Confirm Reset?' : 'Reset Progress'}
                    </button>
                )}
            </div>
        );
    }
    


    // Lesson View
    const isDone = completedLessons.includes(currentLesson.id);

    return (
        <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="flex items-center gap-2 mb-4">
                <button onClick={() => setView('menu')} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    {currentLesson.type === 'concept' ? '📖' : currentLesson.type === 'quiz' ? '❓' : currentLesson.type === 'challenge' ? '⚡' : '🎯'} {t(`${i18nNamespace}:tutorial.levels.${currentLesson.id}.title`)}
                </span>
            </div>

            <div className="space-y-4">
                <SimpleMarkdown text={t(`${i18nNamespace}:tutorial.levels.${currentLesson.id}.desc`)} className="text-slate-400 text-sm" />

                {/* Extra Content (e.g. Violations, Advice) */}
                {renderExtraContent && renderExtraContent()}

                {/* Quiz Interface */}
                {currentLesson.type === 'quiz' && !isDone && (
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
                        <p className="text-sm font-bold text-slate-300">
                            {t(`${i18nNamespace}:tutorial.levels.${currentLesson.id}.question`, { val: currentLesson.targetVal, defaultValue: 'What is the value?' })}
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={quizInput}
                                onChange={(e) => setQuizInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && checkQuiz()}
                                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-center outline-none focus:border-blue-500"
                                placeholder="?"
                            />
                            <button
                                onClick={checkQuiz}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-blue-500"
                            >
                                SUBMIT
                            </button>
                        </div>
                        {quizFeedback === 'correct' && <div className="text-green-400 text-xs font-bold flex items-center gap-1"><Sparkles size={12} /> Correct!</div>}
                        {quizFeedback === 'wrong' && <div className="text-red-400 text-xs font-bold">Incorrect, try again.</div>}
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-slate-800">
                {/* Row 1: Reset + Primary Action */}
                <div className="flex gap-2">
                    <button onClick={() => runLesson(lessonIndex)} className="flex-1 py-2.5 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-700 transition-colors">
                        {t('common:reset', 'Reset')}
                    </button>
                    
                    {/* Concept lessons: Show "I Understand" button when not completed */}
                    {currentLesson.type === 'concept' && !isDone && (
                        <button 
                            onClick={() => completeLesson()} 
                            className="flex-[2] py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 hover:bg-blue-500 shadow-lg shadow-blue-900/20"
                        >
                            {t('common:iUnderstand', 'I Understand ✓')}
                        </button>
                    )}

                    {/* Completed: Show Next Level button */}
                    {isDone && lessonIndex < manifest.length - 1 && (
                        <button onClick={() => runLesson(lessonIndex + 1)} className="flex-[2] py-2.5 bg-green-600 text-white rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 hover:bg-green-500 shadow-lg shadow-green-900/20">
                            {t('common:next', 'Next Level')} <Sparkles size={14} />
                        </button>
                    )}

                    {/* Last lesson: Show Finish button */}
                    {isDone && lessonIndex === manifest.length - 1 && (
                        <button onClick={onFinish} className="flex-[2] py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 hover:bg-blue-500 shadow-lg shadow-blue-900/20">
                            {t('common:finish', 'Finish')} <Trophy size={14} />
                        </button>
                    )}
                </div>

                {/* Row 2: Back to Menu (secondary) when completed */}
                {isDone && lessonIndex < manifest.length - 1 && (
                    <button onClick={() => setView('menu')} className="w-full py-2 text-slate-500 text-[10px] font-bold uppercase hover:text-slate-300 transition-colors">
                        {t('common:backToMenu', '← Back to Menu')}
                    </button>
                )}
            </div>
        </div>
    );
}
