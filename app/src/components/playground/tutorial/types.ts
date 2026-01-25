export type LessonType = 'concept' | 'quiz' | 'guided' | 'challenge';

export interface Lesson<T> {
    /** Unique ID for the lesson (e.g., 'l0', 'l1') */
    id: string;
    /** Type determines the UI and interaction model */
    type: LessonType;
    /** Function to set up the board (e.g., insert initial nodes) */
    setup: (structure: T) => void;
    /** Optional: Value to highlight or focus on */
    targetVal?: number;
    /** Optional: Correct answer for 'quiz' type lessons */
    answer?: number;
    /** Optional: Custom function to verify if the lesson is completed */
    check?: (structure: T) => boolean;
    /** Optional: Whether to allow hint toggle (default: true) */
    allowHintToggle?: boolean;
    /** Phase/category of the lesson (1=Foundations, 2=Insert, 3=Delete, 4=Mastery) */
    phase?: 1 | 2 | 3 | 4;
    /** Optional: Dynamic unlock condition based on completed lesson IDs */
    unlockCondition?: (completedIds: string[]) => boolean;
}
