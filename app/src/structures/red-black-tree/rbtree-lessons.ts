import type { Lesson } from '../../components/playground/tutorial/types';
import { RedBlackTree } from './RedBlackTree';

// Helper: Check if lessons are completed
const hasCompleted = (ids: string[], completedIds: string[]) =>
    ids.every(id => completedIds.includes(id));

const countCompleted = (ids: string[], completedIds: string[]) =>
    ids.filter(id => completedIds.includes(id)).length;

// (FOUNDATION_IDS removed - unused)

// Phase 2 Insert Case IDs
const INSERT_CASE_IDS = ['insert_case0', 'insert_case1_1', 'insert_case1_2', 'insert_case2_1', 'insert_case2_2', 'insert_case3_1', 'insert_case3_2', 'insert_challenge'];

// Phase 3 Delete Case IDs
const DELETE_CASE_IDS = ['delete_red_leaf', 'delete_red_replacement', 'delete_case1', 'delete_case2', 'delete_case3', 'delete_case4', 'delete_challenge'];

export const RB_LESSONS: Lesson<RedBlackTree>[] = [
    // ============================================
    // PHASE 1: FOUNDATIONS (Sequential)
    // ============================================
    {
        id: 'basics',
        type: 'concept',
        phase: 1,
        setup: (tree) => {
            tree.clear();
            tree.insert(10);
            tree.insert(5);
            tree.insert(15);
        },
        allowHintToggle: false
    },
    {
        id: 'colors',
        type: 'concept',
        phase: 1,
        setup: (tree) => {
            tree.clear();
            tree.insert(10);
            tree.insert(5);
            tree.insert(15);
            tree.insert(3);
            tree.insert(7);
        },
        unlockCondition: (completed) => hasCompleted(['basics'], completed),
        allowHintToggle: false
    },
    {
        id: 'black_height',
        type: 'concept',
        phase: 1,
        setup: (tree) => {
            tree.clear();
            tree.insert(20);
            tree.insert(10);
            tree.insert(30);
            tree.insert(5);
            tree.insert(15);
            tree.insert(25);
            tree.insert(35);
        },
        unlockCondition: (completed) => hasCompleted(['basics', 'colors'], completed),
        allowHintToggle: false
    },
    {
        id: 'rotations',
        type: 'guided',
        phase: 1,
        setup: (tree) => {
            tree.clear();
            tree.insert(10);
            tree.insert(5);
            tree.insert(15);
            // Set up for a rotation practice
            tree.insert(3);
        },
        check: (tree) => tree.validate().length === 0,
        unlockCondition: (completed) => hasCompleted(['basics', 'colors', 'black_height'], completed),
        allowHintToggle: true
    },
    {
        id: 'foundation_quiz',
        type: 'quiz',
        phase: 1,
        setup: (tree) => {
            tree.clear();
            tree.insert(10);
            tree.insert(5);
            tree.insert(15);
        },
        answer: 2, // Example: "What is the black height of this tree?"
        unlockCondition: (completed) => hasCompleted(['basics', 'colors', 'black_height', 'rotations'], completed),
        allowHintToggle: false
    },

    // ============================================
    // PHASE 2: INSERT CASES (Unlock after Phase 1)
    // ============================================
    {
        id: 'insert_case0',
        type: 'concept', // Changed: stay in auto mode to observe algorithm
        phase: 2,
        setup: (tree) => {
            tree.clear();
            tree.insert(10);
            tree.insert(5);
            tree.insert(15);
            // Ready for simple insert - tree is valid
        },
        check: (tree) => tree.find(3) !== null && tree.validate().length === 0,
        unlockCondition: (completed) => hasCompleted(['foundation_quiz'], completed),
        allowHintToggle: false
    },
    // Wiki Case 1: Uncle is Red
    {
        id: 'insert_case1_1', // Internal Node Recolor
        type: 'guided',
        phase: 2,
        setup: (tree) => {
            tree.clear();
            // Build a tree where the conflict happens deeper
            // Root(30, Black)
            tree.insert(30); 
            // Left(20, Black), Right(40, Black) - 20 will be our GP
            tree.insert(20);
            tree.insert(40);
            // Ensure 20 is black (it is by default if 30 is black, handled by insert logic, but let's force)
            if (tree.root) tree.root.color = 'black';
            if (tree.getNode(20)) tree.getNode(20)!.color = 'black';
            if (tree.getNode(40)) tree.getNode(40)!.color = 'black';

            // Children of 20: 10(Red), 25(Red)
            tree.insert(10);
            tree.insert(25);
            if (tree.getNode(10)) tree.getNode(10)!.color = 'red';
            if (tree.getNode(25)) tree.getNode(25)!.color = 'red';

            // User will insert 5 (Left of 10)
        },
        check: (tree) => tree.find(5) !== null && tree.getNode(20)?.color === 'red' && tree.validate().length === 0,
        unlockCondition: (completed) => hasCompleted(['foundation_quiz'], completed),
        allowHintToggle: true
    },
    {
        id: 'insert_case1_2', // Root Recolor
        type: 'guided',
        phase: 2,
        setup: (tree) => {
            tree.clear();
            tree.insert(10);
            tree.insert(5);
            tree.insert(15);
            // Both children red = Uncle is Red scenario when inserting
            // Parent: 5 (Red), Uncle: 15 (Red), GP: 10 (Root, Black)
            if (tree.root) tree.root.color = 'black';
            if (tree.root?.left) tree.root.left.color = 'red';
            if (tree.root?.right) tree.root.right.color = 'red';

            // User will insert 1
        },
        check: (tree) => tree.find(1) !== null && tree.root?.color === 'black' && tree.validate().length === 0,
        unlockCondition: (completed) => hasCompleted(['foundation_quiz'], completed),
        allowHintToggle: true
    },
    // Wiki Case 2: Line (LL / RR) - Should come BEFORE Triangle
    {
        id: 'insert_case2_1', // Wiki Case 2 (Line) - LL
        type: 'guided',
        phase: 2,
        setup: (tree) => {
            // Line case: Left-Left (LL)
            tree.clear();
            tree.insert(20);
            tree.insert(15);
            tree.insert(25);
            if (tree.root) tree.root.color = 'black';
            if (tree.getNode(15)) tree.getNode(15)!.color = 'black';
            if (tree.getNode(25)) tree.getNode(25)!.color = 'black';
            
            // Parent: 10 (Red)
            tree.insert(10);
            if (tree.getNode(10)) tree.getNode(10)!.color = 'red';
            
            // User will insert 5
        },
        check: (tree) => tree.find(5) !== null && tree.validate().length === 0,
        unlockCondition: (completed) => hasCompleted(['foundation_quiz'], completed),
        allowHintToggle: true
    },
    {
        id: 'insert_case2_2', // Wiki Case 2 (Line) - RR
        type: 'guided',
        phase: 2,
        setup: (tree) => {
            // Line case: Right-Right (RR)
            tree.clear();
            tree.insert(10);
            tree.insert(5);
            tree.insert(15);
            
            if (tree.root) tree.root.color = 'black';
            if (tree.getNode(5)) tree.getNode(5)!.color = 'black';
            if (tree.getNode(15)) tree.getNode(15)!.color = 'black';
            
            // Parent: 20 (Red)
            tree.insert(20);
            if (tree.getNode(20)) tree.getNode(20)!.color = 'red';

            // User will insert 25
        },
        check: (tree) => tree.find(25) !== null && tree.validate().length === 0,
        unlockCondition: (completed) => hasCompleted(['foundation_quiz'], completed),
        allowHintToggle: true
    },

    // Wiki Case 3: Triangle (LR / RL) - Should come AFTER Line
    {
        id: 'insert_case3_1', // Wiki Case 3 (Triangle) - LR
        type: 'guided',
        phase: 2,
        setup: (tree) => {
            // Triangle case: Left-Right (LR)
            tree.clear();
            tree.insert(20);
            tree.insert(10);
            tree.insert(25);
            if (tree.root) tree.root.color = 'black';
            if (tree.getNode(10)) tree.getNode(10)!.color = 'black';
            if (tree.getNode(25)) tree.getNode(25)!.color = 'black';
            
            // Parent: 5 (Red)
            tree.insert(5);
            if (tree.getNode(5)) tree.getNode(5)!.color = 'red';

            // User will insert 7
        },
        check: (tree) => tree.find(7) !== null && tree.validate().length === 0,
        unlockCondition: (completed) => hasCompleted(['foundation_quiz'], completed),
        allowHintToggle: true
    },
    {
        id: 'insert_case3_2', // Wiki Case 3 (Triangle) - RL
        type: 'guided',
        phase: 2,
        setup: (tree) => {
            // Triangle case: Right-Left (RL)
            tree.clear();
            tree.insert(10);
            tree.insert(5);
            tree.insert(20);
            if (tree.root) tree.root.color = 'black';
            if (tree.getNode(5)) tree.getNode(5)!.color = 'black';
            if (tree.getNode(20)) tree.getNode(20)!.color = 'black';
            
            // Parent: 25 (Red)
            tree.insert(25);
            if (tree.getNode(25)) tree.getNode(25)!.color = 'red';

            // User will insert 22
        },
        check: (tree) => tree.find(22) !== null && tree.validate().length === 0,
        unlockCondition: (completed) => hasCompleted(['foundation_quiz'], completed),
        allowHintToggle: true
    },
    {
        id: 'insert_challenge',
        type: 'challenge',
        phase: 2,
        setup: (tree) => {
            tree.clear();
            // Start empty - let user build from scratch to practice everything
        },
        check: (tree) => {
            // Check for existence of all nodes in the sequence: 20, 10, 30, 5, 4, 40, 35
            const values = [20, 10, 30, 5, 4, 40, 35];
            const allExist = values.every(v => tree.find(v) !== null);
            return allExist && tree.validate().length === 0;
        },
        unlockCondition: (completed) => countCompleted(INSERT_CASE_IDS.slice(0, 7), completed) >= 6,
        allowHintToggle: false
    },

    // ============================================
    // PHASE 3: DELETE CASES (Unlock after 3 Insert Cases)
    // ============================================
    // ============================================
    // PHASE 3: DELETE CASES (Unlock after 3 Insert Cases)
    // ============================================
    {
        id: 'delete_red_leaf',
        type: 'guided',
        phase: 3,
        setup: (tree) => {
            tree.clear();
            // 10(B) -> 5(R), 15(R)
            // BH = 1 (excluding root)
            tree.insert(10);
            tree.insert(5);
            tree.insert(15);
            if (tree.root) tree.root.color = 'black';
            if (tree.getNode(5)) tree.getNode(5)!.color = 'red';
            if (tree.getNode(15)) tree.getNode(15)!.color = 'red';
            // Delete 5 (Red Leaf)
        },
        check: (tree) => tree.find(5) === null && tree.validate().length === 0,
        unlockCondition: (completed) => countCompleted(INSERT_CASE_IDS.slice(0, 7), completed) >= 5,
        allowHintToggle: true
    },
    {
        id: 'delete_red_replacement',
        type: 'guided',
        phase: 3,
        setup: (tree) => {
            tree.clear();
            // 10(B) -> 5(B) -> 2(R)
            // Sibling 15(B) to balance
            tree.insert(10);
            tree.insert(5);
            tree.insert(15);
            tree.insert(2);
            
            if (tree.root) tree.root.color = 'black';
            if (tree.getNode(5)) tree.getNode(5)!.color = 'black';
            if (tree.getNode(15)) tree.getNode(15)!.color = 'black';
            if (tree.getNode(2)) tree.getNode(2)!.color = 'red';
            
            // Delete 5: Black node with Red child (2)
        },
        check: (tree) => tree.find(5) === null && tree.validate().length === 0,
        unlockCondition: (completed) => countCompleted(INSERT_CASE_IDS.slice(0, 6), completed) >= 3,
        allowHintToggle: true
    },
    {
        id: 'delete_case1',
        type: 'guided',
        phase: 3,
        setup: (tree) => {
            tree.clear();
            // Case 1: Sibling is Red
            // 20(B) -> 10(B), 30(R)
            // 30 -> 25(B), 35(B)
            tree.insert(20);
            tree.insert(10);
            tree.insert(30);
            tree.insert(25);
            tree.insert(35);
            
            if (tree.root) tree.root.color = 'black';
            if (tree.getNode(10)) tree.getNode(10)!.color = 'black';
            if (tree.getNode(30)) tree.getNode(30)!.color = 'red';
            if (tree.getNode(25)) tree.getNode(25)!.color = 'black';
            if (tree.getNode(35)) tree.getNode(35)!.color = 'black';
        },
        check: (tree) => tree.find(10) === null && tree.validate().length === 0,
        unlockCondition: (completed) => countCompleted(INSERT_CASE_IDS.slice(0, 6), completed) >= 3,
        allowHintToggle: true
    },
    {
        id: 'delete_case2',
        type: 'guided',
        phase: 3,
        setup: (tree) => {
            tree.clear();
            // Case 2: Sibling Black, Nephews Black
            // 20(B) -> 10(B), 30(B)
            tree.insert(20);
            tree.insert(10);
            tree.insert(30);
            
            if (tree.root) tree.root.color = 'black';
            if (tree.getNode(10)) tree.getNode(10)!.color = 'black';
            if (tree.getNode(30)) tree.getNode(30)!.color = 'black';
        },
        check: (tree) => tree.find(10) === null && tree.validate().length === 0,
        unlockCondition: (completed) => countCompleted(INSERT_CASE_IDS.slice(0, 6), completed) >= 3,
        allowHintToggle: true
    },
    {
        id: 'delete_case3',
        type: 'guided',
        phase: 3,
        setup: (tree) => {
            tree.clear();
            // Case 3: Sibling Black, Near Nephew Red, Far Nephew Black
            // 20(B) -> 10(B), 30(B)
            // 30 -> 25(R) (Near)
            tree.insert(20);
            tree.insert(10);
            tree.insert(30);
            tree.insert(25);
            
            if (tree.root) tree.root.color = 'black';
            if (tree.getNode(10)) tree.getNode(10)!.color = 'black';
            if (tree.getNode(30)) tree.getNode(30)!.color = 'black';
            if (tree.getNode(25)) tree.getNode(25)!.color = 'red';
        },
        check: (tree) => tree.find(10) === null && tree.validate().length === 0,
        unlockCondition: (completed) => countCompleted(INSERT_CASE_IDS.slice(0, 6), completed) >= 3,
        allowHintToggle: true
    },
    {
        id: 'delete_case4',
        type: 'guided',
        phase: 3,
        setup: (tree) => {
            tree.clear();
            // Case 4: Sibling Black, Far Nephew Red
            // 20(B) -> 10(B), 30(B)
            // 30 -> 35(R) (Far)
            tree.insert(20);
            tree.insert(10);
            tree.insert(30);
            tree.insert(35);
            
            if (tree.root) tree.root.color = 'black';
            if (tree.getNode(10)) tree.getNode(10)!.color = 'black';
            if (tree.getNode(30)) tree.getNode(30)!.color = 'black';
            if (tree.getNode(35)) tree.getNode(35)!.color = 'red';
        },
        check: (tree) => tree.find(10) === null && tree.validate().length === 0,
        unlockCondition: (completed) => countCompleted(INSERT_CASE_IDS.slice(0, 6), completed) >= 3,
        allowHintToggle: true
    },
    {
        id: 'delete_challenge',
        type: 'challenge',
        phase: 3,
        setup: (tree) => {
            tree.clear();
            tree.insert(50);
            tree.insert(25);
            tree.insert(75);
            tree.insert(10);
            tree.insert(30);
            tree.insert(60);
            tree.insert(85);
            tree.insert(5);
            tree.insert(15);
        },
        check: (tree) => tree.find(25) === null && tree.find(75) === null && tree.validate().length === 0,
        unlockCondition: (completed) => countCompleted(DELETE_CASE_IDS.slice(0, 6), completed) >= 3,
        allowHintToggle: false
    },

    // ============================================
    // PHASE 4: MASTERY
    // ============================================
    {
        id: 'final_challenge',
        type: 'challenge',
        phase: 4,
        setup: (tree) => {
            tree.clear();
            tree.insert(40);
            tree.insert(20);
            tree.insert(60);
            tree.insert(10);
            tree.insert(30);
            tree.insert(50);
            tree.insert(70);
        },
        check: (tree) => {
            // Must have inserted and deleted specific nodes
            return tree.find(5) !== null && tree.find(25) !== null &&
                tree.find(10) === null && tree.validate().length === 0;
        },
        unlockCondition: (completed) => countCompleted(DELETE_CASE_IDS.slice(0, 6), completed) >= 3,
        allowHintToggle: false
    },
    {
        id: 'graduation',
        type: 'concept',
        phase: 4,
        setup: (tree) => {
            tree.clear();
            // Final congratulatory tree
            tree.insert(42);
        },
        unlockCondition: (completed) => hasCompleted(['final_challenge'], completed),
        allowHintToggle: false
    }
];
