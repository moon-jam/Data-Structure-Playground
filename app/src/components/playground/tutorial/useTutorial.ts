import { useState, useEffect, useCallback } from 'react';
import type { Lesson } from './types';

interface UseTutorialProps<T> {
    manifest: Lesson<T>[];
    structureId: string; // Key for localStorage (e.g. 'avl', 'rbtree')
    structure: T; // The data structure instance
    onReset: () => void; // Callback to reset the playground (clear history, etc)
    onUpdateView?: () => void; // Callback to force a re-render/update of the view after setup
}

export function useTutorial<T>({ manifest, structureId, structure, onReset, onUpdateView }: UseTutorialProps<T>) {
    // State
    const [view, setView] = useState<'menu' | 'lesson'>('menu');
    const [lessonIndex, setLessonIndex] = useState(0);
    const [maxUnlocked, setMaxUnlocked] = useState(0);
    const [completedLessons, setCompletedLessons] = useState<string[]>([]);

    // Quiz State
    const [quizInput, setQuizInput] = useState('');
    const [quizFeedback, setQuizFeedback] = useState<'correct' | 'wrong' | null>(null);

    // Progress Persistence Keys
    const KEY_MAX = `ds-playground-${structureId}-max-level`;
    const KEY_COMPLETED = `ds-playground-${structureId}-completed-lessons`;

    // Load progress on mount
    useEffect(() => {
        const savedMax = localStorage.getItem(KEY_MAX);
        if (savedMax) {
            setMaxUnlocked(parseInt(savedMax));
        }

        const savedCompleted = localStorage.getItem(KEY_COMPLETED);
        if (savedCompleted) {
            try {
                setCompletedLessons(JSON.parse(savedCompleted));
            } catch {
                setCompletedLessons([]);
            }
        }
    }, [KEY_MAX, KEY_COMPLETED]);

    const runLesson = useCallback((index: number) => {
        if (index < 0 || index >= manifest.length) return;

        setLessonIndex(index);
        setView('lesson');
        setQuizInput('');
        setQuizFeedback(null);

        // Reset the board first
        onReset();

        // Run setup
        manifest[index].setup(structure);

        // Force view update if needed (e.g. to reflect new tree state)
        if (onUpdateView) onUpdateView();

    }, [manifest, structure, onReset, onUpdateView]);

    const completeLesson = useCallback((lessonId?: string) => {
        const id = lessonId || manifest[lessonIndex].id;

        // Add to completed if not already
        if (!completedLessons.includes(id)) {
            const newCompleted = [...completedLessons, id];
            setCompletedLessons(newCompleted);
            localStorage.setItem(KEY_COMPLETED, JSON.stringify(newCompleted));
        }

        // Update maxUnlocked for sequential fallback
        const next = lessonIndex + 1;
        if (next > maxUnlocked) {
            setMaxUnlocked(next);
            localStorage.setItem(KEY_MAX, next.toString());
        }
    }, [lessonIndex, maxUnlocked, completedLessons, manifest, KEY_MAX, KEY_COMPLETED]);

    const checkQuiz = useCallback(() => {
        const lesson = manifest[lessonIndex];
        if (lesson.type !== 'quiz' || lesson.answer === undefined) return;

        const val = parseInt(quizInput);
        if (!isNaN(val) && val === lesson.answer) {
            setQuizFeedback('correct');
            completeLesson();
        } else {
            setQuizFeedback('wrong');
        }
    }, [manifest, lessonIndex, quizInput, completeLesson]);

    const resetProgress = useCallback(() => {
        localStorage.removeItem(KEY_MAX);
        localStorage.removeItem(KEY_COMPLETED);
        setMaxUnlocked(0);
        setCompletedLessons([]);
    }, [KEY_MAX, KEY_COMPLETED]);

    return {
        view,
        setView,
        lessonIndex,
        currentLesson: manifest[lessonIndex],
        maxUnlocked,
        completedLessons, // NEW: Expose completed lesson IDs
        quizInput,
        setQuizInput,
        quizFeedback,
        runLesson,
        completeLesson, // Exposed for external checks (e.g. in Page useEffect)
        checkQuiz,
        resetProgress
    };
}
