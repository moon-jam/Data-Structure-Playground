import React, { useState, useEffect, useRef } from 'react';
import { RedBlackTree, RBNode } from '../structures/red-black-tree/RedBlackTree';
import { SEO } from '../components/SEO';
import type { RBSnapshot } from '../structures/red-black-tree/RedBlackTree';
import { RedBlackNode } from '../components/red-black-tree/RedBlackNode';
import type { VisualizationStep } from '../structures/common/types';
import { ControlIsland } from '../components/playground/ControlIsland';
import { PlaybackControls } from '../components/playground/PlaybackControls';
import { SimpleMarkdown } from '../components/playground/SimpleMarkdown';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { PanelLeft, PanelLeftClose, Plus, Minus, LocateFixed, Trash2, RefreshCw, ScrollText, BookOpen, GraduationCap, Check, AlertCircle, X, Info, HelpCircle, Palette, Undo2, Sparkles, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PrerequisiteBanner } from '../components/playground/PrerequisiteBanner';
import { CongratsModal } from '../components/playground/CongratsModal';

import { useTutorial } from '../components/playground/tutorial/useTutorial';
import { TutorialView } from '../components/playground/tutorial/TutorialView';
import { RB_LESSONS } from '../structures/red-black-tree/rbtree-lessons';




export const RedBlackTreePage: React.FC = () => {
    const { t } = useTranslation(['common', 'rbtree'], { useSuspense: false });
    const [tree] = useState(() => new RedBlackTree());
    const [snapshot, setSnapshot] = useState<RBSnapshot>(null);

    // State
    const [mode, setMode] = useState<'auto' | 'manual'>('auto');
    const [violations, setViolations] = useState<import('../structures/red-black-tree/RedBlackTree').RBViolation[]>([]);
    const [pulsingId, _] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [helpTab, setHelpTab] = useState<'concept' | 'ui'>('concept');
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
    const [activeTab, setActiveTab] = useState<'logs' | 'wiki' | 'tutorial'>('logs');

    // Playback State
    const [history, setHistory] = useState<{ id: string, action: string, steps: VisualizationStep[], finalSnapshot: RBSnapshot }[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [activeSteps, setActiveSteps] = useState<VisualizationStep[]>([]);
    const [currentStepIdx, setCurrentStepIdx] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
    const [currentMsg, setCurrentStepMsg] = useState<string | null>(null);
    const [currentMsgType, setCurrentStepMsgType] = useState<string>('info');
    const [resetConfirm, setResetConfirm] = useState(false);
    
    // Help & Tour States
    const [tourStep, setTourStep] = useState(-1);
    const tourHighlight = (step: number) => tourStep === step ? `z-[10001] relative ring-4 ring-yellow-400 ${step === 0 ? '' : 'shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]'}` : '';

    const [selectedNode, setSelectedNode] = useState<RBNode | null>(null);
    const [deletionStrategy, setDeletionStrategy] = useState<'predecessor' | 'successor'>('successor');

    const [showHint, setShowHint] = useState(false);
    const [warningToast, setWarningToast] = useState<string | null>(null);
    const [lockedTargetId, setLockedTargetId] = useState<string | null>(null);
    const [showCongrats, setShowCongrats] = useState(false);

    // Tutorial Hook
    const tutorial = useTutorial({
        manifest: RB_LESSONS,
        structureId: 'rb',
        structure: tree,
        onReset: () => {
            tree.root = null;
            setSnapshot(null);
            setViolations([]);
            setFixPlan(null);
            setDeleteFixupInfo(null);
            setHistory([{ id: 'init', action: 'Lesson Start', steps: [], finalSnapshot: null }]);
            setHistoryIndex(0);
            setActiveSteps([]);
            setCurrentStepIdx(-1);
            setMode('manual');
        },
        onUpdateView: () => {
            // Force snapshot update
            setSnapshot(calculateLayout(tree.root));
            setViolations(tree.validate());
        }
    });

    // Monitor Lesson Completion
    useEffect(() => {
        if (activeTab === 'tutorial' && tutorial.view === 'lesson' && !isPlaying) {
            const lesson = tutorial.currentLesson;
            
            // Auto-switch mode based on lesson type
            if (lesson.type === 'concept' && mode !== 'auto') {
                setMode('auto'); // Concept lessons use auto mode to observe
            } else if ((lesson.type === 'guided' || lesson.type === 'challenge') && mode !== 'manual') {
                setMode('manual'); // Guided/challenge use manual mode for hands-on
            }
            
            // Handle Hint Visibility based on lesson settings
            // If lesson doesn't allow toggle, force it off (or on if we decided guided lessons default on?)
            // Actually, let's respect the current showHint state but reset it when lesson changes?
            // See useEffect below.

            if (lesson.type === 'guided' || lesson.type === 'challenge') {
                // Check if custom check passes
                if (lesson.check && lesson.check(tree)) {
                    // Check if there are no violations
                    if (tree.validate().length === 0) {
                        tutorial.completeLesson();
                    }
                }
            }
        }
    }, [historyIndex, tree, tutorial, activeTab, isPlaying, mode]);

    // Reset hint visibility when lesson changes
    useEffect(() => {
        if (activeTab === 'tutorial' && tutorial.view === 'lesson') {
            // Default to showing hint for guided lessons unless toggle says otherwise?
            // Actually, let's start with hint HIDDEN and let user toggle it if allowed.
            setShowHint(false);
        }
    }, [tutorial.lessonIndex, activeTab, tutorial.view]);


    // Fix Plan - remembers multi-step fix procedures
    type FixStep = {
        action: 'recolor' | 'rotate';
        nodeValue: number;
        direction?: 'left' | 'right';
        targetColor?: 'red' | 'black';
        description: string;
        isSkipped?: boolean;  // Step is shown but doesn't need user action
        skipReason?: string;  // Explanation for why step is skipped
        isCompleted?: boolean; // Step has been performed by user
    };
    type FixPlan = {
        caseType: string;  // e.g., 'RR', 'LL', 'Uncle Red', 'Root Red'
        steps: FixStep[];
        currentStepIndex: number;
        originalViolationNodeIds: string[];
    };
    const [fixPlan, setFixPlan] = useState<FixPlan | null>(null);

    // Delete Fixup Info - tracks position of double-black for manual delete
    type DeleteFixupInfo = {
        parentId: string | null;
        isLeftChild: boolean | null;
        needsFixup: boolean;
        deletedWasBlack?: boolean;
    };
    const [deleteFixupInfo, setDeleteFixupInfo] = useState<DeleteFixupInfo | null>(null);

    // Input
    const [inputValue, setInputValue] = useState('');
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync deletion strategy to tree
    useEffect(() => {
        tree.deletionStrategy = deletionStrategy;
    }, [deletionStrategy, tree]);

    // tutorialView managed by hook now

    // tutorialView managed by hook now

    const [sidebarWidth, setSidebarWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);
    const [isHoveringNode, setIsHoveringNode] = useState(false);

    // Resize Handlers
    const startResizing = () => setIsResizing(true);
    const stopResizing = () => setIsResizing(false);
    const resize = (e: MouseEvent) => {
        if (isResizing) {
            const newWidth = e.clientX;
            if (newWidth >= 280 && newWidth < 600) setSidebarWidth(newWidth);
        }
    };

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isResizing]);

    useEffect(() => {
        if (historyIndex === -1) {
            setHistory([{ id: 'init', action: 'Initial', steps: [], finalSnapshot: null }]);
            setHistoryIndex(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (resetConfirm) {
            const timer = setTimeout(() => setResetConfirm(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [resetConfirm]);

    useEffect(() => {
        // Check if help has been seen before
        const helpSeen = localStorage.getItem('ds-playground-rbtree-help-seen') === 'true';
        if (!helpSeen) {
            setShowHelp(true);
            localStorage.setItem('ds-playground-rbtree-help-seen', 'true');
        }
        
        // Check tutorial progress to auto-open tab
        const savedMax = localStorage.getItem('ds-playground-rbtree-max-level');
        const isCompleted = localStorage.getItem('ds-playground-rbtree-completed') === 'true';
        
        if (!isCompleted && !savedMax && !helpSeen) {
             // If first time user (no max level, not completed, help just shown), 
             // we might want to default to tutorial, but maybe after help is closed?
             // AVL logic: if (!isCompleted && !savedMax) setActiveTab('tutorial');
             setActiveTab('tutorial');
        }
    }, []);

    // --- Layout Engine (Basic Binary Tree) ---
    const calculateLayout = (root: RBNode | null) => {
        if (!root) return null;

        // Calculate depth and positions
        // Reingold-Tilford inspired but simplified for binary tree
        // First pass: calculate widths
        const widths = new Map<string, number>();

        const getWidth = (node: RBNode | null): number => {
            if (!node) return 0;
            const leftW = getWidth(node.left);
            const rightW = getWidth(node.right);
            // Node width is its own width (60) plus spacing?
            // Actually subtree width
            const width = Math.max(60, leftW + rightW + 40); // 60 is node size, 40 is spacing
            widths.set(node.id, width);
            return width;
        };

        getWidth(root);

        // Layout using inorder traversal for X positions
        let nextX = 0;
        const assignX = (node: RBNode | null, depth: number) => {
            if (!node) return;
            assignX(node.left, depth + 1);
            node.x = nextX * 60; // 60px spacing
            node.y = depth * 80;
            nextX++;
            assignX(node.right, depth + 1);
        };

        assignX(root, 0);

        // Recenter root to 0
        const rootX = root.x;
        const shift = (node: RBNode | null) => {
            if (!node) return;
            node.x -= rootX;
            shift(node.left);
            shift(node.right);
        };
        shift(root);

        return root;
    };

    // --- Playback Engine ---
    const startOperation = (action: string, steps: VisualizationStep[]) => {
        stopPlayback();
        setActiveSteps(steps);
        setCurrentStepIdx(0);
        // Get final snapshot from last step or current tree state
        const finalSnapshot = steps.length > 0 && steps[steps.length - 1].payload?.snapshot
            ? steps[steps.length - 1].payload.snapshot
            : tree.getSnapshot();
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ id: Math.random().toString(36), action, steps, finalSnapshot });
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        startPlayback(steps.length);
    };

    const startPlayback = (total: number, startAt = 0) => {
        setIsPlaying(true);
        let idx = startAt;
        const play = () => {
            if (idx < total - 1) {
                idx++;
                setCurrentStepIdx(idx);
                timerRef.current = setTimeout(play, 800 / playbackSpeed);
            } else {
                setIsPlaying(false);
            }
        };
        play();
    };

    const stopPlayback = () => { if (timerRef.current) clearTimeout(timerRef.current); setIsPlaying(false); };

    const goToStep = (idx: number) => {
        stopPlayback();
        if (idx >= 0 && idx < activeSteps.length) setCurrentStepIdx(idx);
    };

    useEffect(() => {
        if (activeSteps.length > 0 && currentStepIdx >= 0) {
            const step = activeSteps[currentStepIdx];
            if (step.payload?.snapshot !== undefined) {
                const snap = step.payload.snapshot;
                // Re-validate on every step in manual mode
                if (mode === 'manual' && snap) {
                    // We need a temporary tree to validate the snapshot
                    // Or assume the tree matches snapshot if it's the latest
                    // For now, let's just use tree.validate() if we are at the end of history?
                    // Better: Validate the snapshot directly? 
                    // The snapshot is just nodes. We need the tree logic to validate.
                    // Let's rely on the tree state for validation when NOT playing back history or when at the end.

                    // Actually, validation results should probably be calculated from the snapshot if possible,
                    // but our validate() method is on the class instance.
                    // We can temporarily update tree root to snapshot, validate, then restore? No that's risky.

                    // Simplified: Only show violations based on current actual tree state if we are at the latest point.
                }
                setSnapshot(calculateLayout(snap));
            }
            setHighlightedIds(step.targetIds || []);
            setCurrentStepMsg(step.message || null);
            setCurrentStepMsgType(step.type || 'info');
        }
    }, [currentStepIdx, activeSteps, mode]);

    // Violations Check Effect
    useEffect(() => {
        if (mode === 'manual' && !isPlaying) {
            setViolations(tree.validate());
        } else if (mode === 'auto') {
            setViolations([]);
        }
    }, [historyIndex, mode, tree, snapshot, isPlaying]); // Re-run when history changes, snapshot updates, or playback ends



    // --- Handlers ---
    const handleInsert = () => {
        // Batch insert support (comma separated)
        const values = inputValue.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

        if (values.length > 0) {
            // Processing sequentially


            // For now, to satisfy the specific request without breaking Manual Mode flow:
            // Just take the first value. 
            // OR: Implement a queue?
            // "insert 1, 2, 3" -> 1 is inserted. User fixes. 
            // Then 2?
            // That's complex.

            // Let's assume the user wants to populate the tree quickly in AUTO mode.
            if (mode === 'auto') {
                // In auto mode, we can just run them all and show the last animation or combined steps?
                // Combined steps is best.
                const allSteps: VisualizationStep[] = [];
                values.forEach(v => {
                    const s = tree.insert(v);
                    allSteps.push(...s);
                });
                startOperation(`Batch Insert ${values.join(', ')}`, allSteps);
                setInputValue('');
            } else {
                // Manual mode: Pick the first new value
                const val = values[0];
                const steps = tree.insertManual(val);
                startOperation(`Insert ${val}`, steps);
                // If there were more, maybe keep them in input?
                if (values.length > 1) {
                    setInputValue(values.slice(1).join(','));
                } else {
                    setInputValue('');
                }
            }
        }
    };

    const handleNodeClick = (node: RBNode) => {
        if (isPlaying) return;
        if (mode === 'manual') {
            // Check if this matches ANY expected fix plan step that isn't done yet
            if (fixPlan && fixPlan.steps.length > 0) {
                // Find a matching step that is NOT completed and NOT skipped
                const matchingStepIndex = fixPlan.steps.findIndex(step =>
                    !step.isCompleted && !step.isSkipped &&
                    step.action === 'recolor' && step.nodeValue === node.value
                );

                if (matchingStepIndex !== -1) {
                    // Correct action - perform it
                    startOperation(`Toggle Color ${node.value}`, tree.toggleColor(node.id));

                    // Mark step as completed
                    const newSteps = [...fixPlan.steps];
                    newSteps[matchingStepIndex] = { ...newSteps[matchingStepIndex], isCompleted: true };

                    // Update plan - currentStepIndex is now just for progress bar or finding first undone
                    const firstUndone = newSteps.findIndex(s => !s.isCompleted && !s.isSkipped);

                    setFixPlan({
                        ...fixPlan,
                        steps: newSteps,
                        currentStepIndex: firstUndone === -1 ? newSteps.length : firstUndone
                    });

                    // Don't hide hint in checklist mode - users like to see items checked off
                    // setShowHint(false); 
                    return;
                } else {
                    // Check if it matches a completed/skipped step (to give better feedback)
                    const isAlreadyDone = fixPlan.steps.some(step =>
                        (step.isCompleted || step.isSkipped) &&
                        step.action === 'recolor' && step.nodeValue === node.value
                    );

                    if (isAlreadyDone) {
                        setWarningToast(`${t('rbtree:guide.alreadyDone')}`);
                        setTimeout(() => setWarningToast(null), 3000);
                        return; // Don't execute
                    }

                    // Wrong action - show warning and DON'T execute
                    // Find legitimate next steps to show as expected
                    const nextSteps = fixPlan.steps.filter(s => !s.isCompleted && !s.isSkipped);
                    const expectedText = nextSteps.length > 0
                        ? nextSteps.map(s => s.action === 'recolor' ? `${t('rbtree:guide.clickNode')} ${s.nodeValue}` : `${t('rbtree:guide.dragNode')} ${s.nodeValue}`).join(' ' + t('common:or') + ' ')
                        : t('rbtree:guide.allStepsComplete');

                    setWarningToast(`${t('rbtree:guide.wrongAction')} ${t('rbtree:guide.expected')}: ${expectedText}`);
                    setTimeout(() => setWarningToast(null), 3000);
                    return; // Don't execute the toggle
                }
            }
            // Only execute if no fix plan is active (or fix plan was already completed)
            startOperation(`Toggle Color ${node.value}`, tree.toggleColor(node.id));
        } else {
            setSelectedNode(node);
        }
    };

    const handleNodeDrag = (node: RBNode, direction: 'left' | 'right') => {
        if (isPlaying) return;
        if (mode === 'manual') {
            // Check if this matches ANY expected fix plan step that isn't done yet
            if (fixPlan && fixPlan.steps.length > 0) {
                // Find a matching step that is NOT completed and NOT skipped
                const matchingStepIndex = fixPlan.steps.findIndex(step =>
                    !step.isCompleted && !step.isSkipped &&
                    step.action === 'rotate' && step.nodeValue === node.value && step.direction === direction
                );

                if (matchingStepIndex !== -1) {
                    // Check if there are any pending RECOLOR steps
                    // We compel users to finish recoloring before changing structure (rotation)
                    // to avoid confusion and invalid states.
                    const pendingRecolors = fixPlan.steps.some(step =>
                        !step.isCompleted && !step.isSkipped && step.action === 'recolor'
                    );

                    if (pendingRecolors) {
                        setWarningToast(t('rbtree:guide.performRecolorFirst'));
                        setTimeout(() => setWarningToast(null), 3000);
                        return;
                    }

                    // Correct action - perform it
                    startOperation(`Rotate ${direction} ${node.value}`, tree.rotateNode(node.value, direction));

                    // Mark step as completed
                    const newSteps = [...fixPlan.steps];
                    newSteps[matchingStepIndex] = { ...newSteps[matchingStepIndex], isCompleted: true };

                    // Update plan
                    const firstUndone = newSteps.findIndex(s => !s.isCompleted && !s.isSkipped);

                    setFixPlan({
                        ...fixPlan,
                        steps: newSteps,
                        currentStepIndex: firstUndone === -1 ? newSteps.length : firstUndone
                    });

                    // setShowHint(false); // Keep showing list
                    return;
                } else {
                    // Check if matched but wrong direction
                    const wrongDirIdx = fixPlan.steps.findIndex(step =>
                        !step.isCompleted && !step.isSkipped &&
                        step.action === 'rotate' && step.nodeValue === node.value && step.direction !== direction
                    );

                    if (wrongDirIdx !== -1) {
                        const expectedStep = fixPlan.steps[wrongDirIdx];
                        setWarningToast(`${t('rbtree:guide.wrongDirection')} ${t('rbtree:guide.expected')}: ${expectedStep.direction === 'left' ? t('common:left') : t('common:right')}`);
                        setTimeout(() => setWarningToast(null), 3000);
                        return; // Don't execute
                    }

                    // Check if already done
                    const isAlreadyDone = fixPlan.steps.some(step =>
                        (step.isCompleted || step.isSkipped) &&
                        step.action === 'rotate' && step.nodeValue === node.value
                    );

                    if (isAlreadyDone) {
                        setWarningToast(`${t('rbtree:guide.alreadyDone')}`);
                        setTimeout(() => setWarningToast(null), 3000);
                        return; // Don't execute
                    }

                    // Wrong node or action type - show warning
                    // Find legitimate next steps
                    const nextSteps = fixPlan.steps.filter(s => !s.isCompleted && !s.isSkipped);
                    const expectedText = nextSteps.length > 0
                        ? nextSteps.map(s => s.action === 'recolor' ? `${t('rbtree:guide.clickNode')} ${s.nodeValue}` : `${t('rbtree:guide.dragNode')} ${s.nodeValue}`).join(' ' + t('common:or') + ' ')
                        : t('rbtree:guide.allStepsComplete');

                    setWarningToast(`${t('rbtree:guide.wrongAction')} ${t('rbtree:guide.expected')}: ${expectedText}`);
                    setTimeout(() => setWarningToast(null), 3000);
                    return; // Don't execute the rotation
                }
            }
            // Only execute if no fix plan is active (or fix plan was already completed)
            startOperation(`Rotate ${direction} ${node.value}`, tree.rotateNode(node.value, direction));
        }
    };



    const handleDelete = () => {
        const val = selectedNode ? selectedNode.value : parseInt(inputValue);
        if (!isNaN(val)) {
            if (mode === 'manual') {
                // Manual mode: do BST deletion without auto-fix
                const result = tree.deleteManual(val);
                startOperation(`Delete ${val}`, result.steps);

                // Store fixup info and IMMEDIATELY compute fix plan if needed
                if (result.needsFixup && result.fixupParentId) {
                    const info: DeleteFixupInfo = {
                        parentId: result.fixupParentId,
                        isLeftChild: result.fixupIsLeft,
                        needsFixup: true
                    };
                    setDeleteFixupInfo(info);

                    // Pre-compute fix plan NOW using the stored info
                    // We need to compute this after the tree state is updated
                    setTimeout(() => {
                        // CRITICAL: First check if tree has any violations
                        // If tree is balanced after delete, no fix is needed!
                        const currentViolations = tree.validate();
                        if (currentViolations.length === 0) {
                            // Tree is already balanced, no fix needed
                            setDeleteFixupInfo(null);
                            return;
                        }

                        const plan = computeDeleteFixPlan(info);
                        if (plan) {
                            setFixPlan(plan);
                            setShowHint(false); // Will show "Show Hint" button
                        } else {
                            // No plan needed (tree might be balanced)
                            setDeleteFixupInfo(null);
                        }
                    }, 100);
                } else if (result.deletedWasBlack && !result.needsFixup) {
                    // Deleted black node but replacement was red - just need to recolor
                    setDeleteFixupInfo(null);
                    setFixPlan(null);
                } else {
                    setDeleteFixupInfo(null);
                    setFixPlan(null);
                }
            } else {
                // Auto mode: full delete with automatic fixup
                startOperation(`Delete ${val}`, tree.delete(val));
            }
            setInputValue('');
            setSelectedNode(null);
        }
    };

    // Compute delete fix plan from stored info - separate function for reuse
    const computeDeleteFixPlan = (info: DeleteFixupInfo): FixPlan | null => {
        if (!info || !info.needsFixup || !info.parentId) {
            return null;
        }

        const parent = tree.getNodeById(info.parentId);
        if (!parent) return null;

        const isLeft = info.isLeftChild;
        const sibling = isLeft ? parent.right : parent.left;
        const x = isLeft ? parent.left : parent.right;

        const steps: FixStep[] = [];
        let caseType = '';

        const isBlack = (node: import('../structures/red-black-tree/RedBlackTree').RBNode | null) => !node || node.color === 'black';
        const isRed = (node: import('../structures/red-black-tree/RedBlackTree').RBNode | null) => node?.color === 'red';

        // Helper: add recolor step, marking as skipped if already target color
        const addRecolorStep = (nodeValue: number, targetColor: 'red' | 'black', nodeToCheck: import('../structures/red-black-tree/RedBlackTree').RBNode | null) => {
            const currentColor = nodeToCheck?.color;
            const alreadyCorrect = currentColor === targetColor;
            steps.push({
                action: 'recolor',
                nodeValue,
                targetColor,
                description: `${nodeValue} → ${targetColor === 'black' ? t('common:black') : t('common:red')}`,
                isSkipped: alreadyCorrect,
                skipReason: alreadyCorrect ? t('rbtree:guide.alreadyCorrectColor', { val: nodeValue, color: targetColor === 'black' ? t('common:black') : t('common:red') }) : undefined
            });
        };

        if (!parent) return null;

        // Check if x (replacement/current node) is red - simple case (Case 0)
        // This takes priority over sibling checks because if X is red, we just make it black.
        if (x && isRed(x)) {
            caseType = t('rbtree:guide.deleteSimpleCase');
            addRecolorStep(x.value, 'black', x);
            return {
                caseType,
                steps,
                currentStepIndex: 0,
                originalViolationNodeIds: x ? [x.id] : []
            };
        }

        if (!sibling) return null;

        if (isRed(sibling)) {
            caseType = t('rbtree:guide.deleteCase1');
            addRecolorStep(sibling.value, 'black', sibling);
            addRecolorStep(parent.value, 'red', parent);
            steps.push({ action: 'rotate', nodeValue: parent.value, direction: isLeft ? 'left' : 'right', description: t('rbtree:guide.dragToRotate', { val: parent.value, dir: isLeft ? t('common:left') : t('common:right') }) });
        } else {
            const closeNephew = isLeft ? sibling.left : sibling.right;
            const farNephew = isLeft ? sibling.right : sibling.left;

            if (isBlack(closeNephew) && isBlack(farNephew)) {
                caseType = t('rbtree:guide.deleteCase2');
                addRecolorStep(sibling.value, 'red', sibling);
                if (isRed(parent)) {
                    addRecolorStep(parent.value, 'black', parent);
                }
            } else if (isRed(closeNephew) && isBlack(farNephew)) {
                caseType = t('rbtree:guide.deleteCase3');
                addRecolorStep(closeNephew!.value, 'black', closeNephew);
                addRecolorStep(sibling.value, 'red', sibling);
                steps.push({ action: 'rotate', nodeValue: sibling.value, direction: isLeft ? 'right' : 'left', description: t('rbtree:guide.dragToRotate', { val: sibling.value, dir: isLeft ? t('common:right') : t('common:left') }) });
            } else if (isRed(farNephew)) {
                caseType = t('rbtree:guide.deleteCase4');
                addRecolorStep(sibling.value, parent.color, sibling);
                addRecolorStep(parent.value, 'black', parent);
                addRecolorStep(farNephew!.value, 'black', farNephew);
                steps.push({ action: 'rotate', nodeValue: parent.value, direction: isLeft ? 'left' : 'right', description: t('rbtree:guide.dragToRotate', { val: parent.value, dir: isLeft ? t('common:left') : t('common:right') }) });
            }
        }

        if (steps.length === 0) return null;

        return {
            caseType,
            steps,
            currentStepIndex: 0,
            originalViolationNodeIds: [parent.id]
        };
    };

    const handleUndo = () => {
        if (historyIndex <= 0 || isPlaying) return;
        stopPlayback();
        const targetIdx = historyIndex - 1;
        const entry = history[targetIdx];
        // Restore tree state from snapshot
        tree.root = entry.finalSnapshot ? entry.finalSnapshot.clone() : null;
        setSnapshot(calculateLayout(tree.root));
        setActiveSteps(entry.steps);
        setCurrentStepIdx(entry.steps.length > 0 ? entry.steps.length - 1 : -1);
        setHistoryIndex(targetIdx);
    };

    const handleRedo = () => {
        if (historyIndex >= history.length - 1 || isPlaying) return;
        stopPlayback();
        const targetIdx = historyIndex + 1;
        const entry = history[targetIdx];
        setHistoryIndex(targetIdx);
        setActiveSteps(entry.steps);
        setCurrentStepIdx(0);
        startPlayback(entry.steps.length);
    };

    const handleClear = () => {
        if (!resetConfirm) { setResetConfirm(true); return; }
        setResetConfirm(false);
        if (isPlaying) stopPlayback();
        tree.root = null;
        setSnapshot(null);
        setHistory([{ id: 'init', action: 'Cleared', steps: [], finalSnapshot: null }]);
        setHistoryIndex(0);
        setActiveSteps([]);
        setCurrentStepIdx(-1);
        setHighlightedIds([]);
        setCurrentStepMsg(null);
        setSelectedNode(null);
        setShowHint(false);
        setLockedTargetId(null);
        setFixPlan(null);
    };

    // --- Advice Rendering for Manual Mode ---
    const getPriorityViolation = (): import('../structures/red-black-tree/RedBlackTree').RBViolation | null => {
        if (violations.length === 0) return null;

        // Filter out stale violations (where tree state doesn't match violation)
        const activeViolations = violations.filter(v => {
            if (v.type === 'root-red') {
                return tree.root && tree.root.color === 'red';
            }
            if (v.type === 'red-red') {
                const parent = tree.getNodeById(v.nodeIds[0]);
                const child = v.nodeIds[1] ? tree.getNodeById(v.nodeIds[1]) : null;
                // Both must exist and be red
                if (!parent || parent.color !== 'red') return false;
                if (child && child.color !== 'red') return false;

                // CRITICAL: Check if they are still parent-child
                // After rotations, they might become siblings or disconnected
                if (child && parent.left !== child && parent.right !== child) return false;

                return true;
            }
            if (v.type === 'black-height') {
                // Verify if black height mismatch really exists
                const node = tree.getNodeById(v.nodeIds[0]);
                if (!node) return false;

                // Helper to count black height
                const getBH = (n: import('../structures/red-black-tree/RedBlackTree').RBNode | null): number => {
                    if (!n) return 1; // Nil is black
                    const l = getBH(n.left);
                    const r = getBH(n.right);
                    if (l === -1 || r === -1 || l !== r) return -1;
                    return l + (n.color === 'black' ? 1 : 0);
                };

                const leftBH = getBH(node.left);
                const rightBH = getBH(node.right);

                // Only return true if mismatch persists
                return leftBH === -1 || rightBH === -1 || leftBH !== rightBH;
            }
            return true;
        });

        if (activeViolations.length === 0) return null;

        // Priority: root-red > red-red
        const rootViolation = activeViolations.find(v => v.type === 'root-red');
        if (rootViolation) return rootViolation;
        // If there's a locked target, check if it's still in violations
        if (lockedTargetId) {
            const lockedViolation = activeViolations.find(v => v.nodeIds.includes(lockedTargetId));
            if (lockedViolation) return lockedViolation;
        }
        return activeViolations[0];
    };

    // Create a fix plan with all steps needed to fix the current violation
    const createFixPlan = (): FixPlan | null => {
        const violation = getPriorityViolation();
        if (!violation) return null;

        const steps: FixStep[] = [];
        let caseType = '';

        if (violation.type === 'root-red') {
            const rootNode = tree.root;
            if (!rootNode) return null;
            caseType = t('rbtree:guide.caseRootRed');
            steps.push({
                action: 'recolor',
                nodeValue: rootNode.value,
                targetColor: 'black',
                description: t('rbtree:guide.actionRootRed', { val: rootNode.value })
            });
        } else if (violation.type === 'red-red') {
            const parentId = violation.nodeIds[0];
            const childId = violation.nodeIds[1];
            const parentNode = tree.getNodeById(parentId);
            const childNode = childId ? tree.getNodeById(childId) : null;
            const grandparent = parentNode?.parent;

            if (!parentNode || !childNode || !grandparent) return null;

            const uncle = parentNode === grandparent.left ? grandparent.right : grandparent.left;
            const uncleIsRed = uncle?.color === 'red';

            if (uncleIsRed) {
                // Uncle Red case - recolor parent, uncle, grandparent
                caseType = t('rbtree:guide.caseUncleRed');
                steps.push({
                    action: 'recolor',
                    nodeValue: parentNode.value,
                    targetColor: 'black',
                    description: `${parentNode.value} → ${t('common:black')}`
                });
                if (uncle) {
                    steps.push({
                        action: 'recolor',
                        nodeValue: uncle.value,
                        targetColor: 'black',
                        description: `${uncle.value} → ${t('common:black')}`
                    });
                }
                // Check if grandparent is root - if so, it stays black
                const grandparentIsRoot = grandparent === tree.root;
                if (grandparentIsRoot) {
                    // Show the step as skipped - normally would recolor to red, but root stays black
                    steps.push({
                        action: 'recolor',
                        nodeValue: grandparent.value,
                        targetColor: 'red', // Would be red normally
                        description: `${grandparent.value} → ${t('common:red')}`,
                        isSkipped: true,
                        skipReason: t('rbtree:guide.skippedRootStaysBlack')
                    });
                } else {
                    steps.push({
                        action: 'recolor',
                        nodeValue: grandparent.value,
                        targetColor: 'red',
                        description: `${grandparent.value} → ${t('common:red')}`
                    });
                }
            } else {
                // Uncle Black - rotation required
                const isLL = parentNode === grandparent.left && childNode === parentNode.left;
                const isRR = parentNode === grandparent.right && childNode === parentNode.right;
                const isLR = parentNode === grandparent.left && childNode === parentNode.right;
                const isRL = parentNode === grandparent.right && childNode === parentNode.left;

                if (isRR) {
                    caseType = t('rbtree:guide.caseRRBlack');
                    // Step 1: Recolor parent to black
                    steps.push({
                        action: 'recolor',
                        nodeValue: parentNode.value,
                        targetColor: 'black',
                        description: `${parentNode.value} → ${t('common:black')}`
                    });
                    // Step 2: Recolor grandparent to red
                    steps.push({
                        action: 'recolor',
                        nodeValue: grandparent.value,
                        targetColor: 'red',
                        description: `${grandparent.value} → ${t('common:red')}`
                    });
                    // Step 3: Left rotate grandparent
                    steps.push({
                        action: 'rotate',
                        nodeValue: grandparent.value,
                        direction: 'left',
                        description: t('rbtree:guide.dragToRotate', { val: grandparent.value, dir: t('common:left') })
                    });
                } else if (isLL) {
                    caseType = t('rbtree:guide.caseLLBlack');
                    steps.push({
                        action: 'recolor',
                        nodeValue: parentNode.value,
                        targetColor: 'black',
                        description: `${parentNode.value} → ${t('common:black')}`
                    });
                    steps.push({
                        action: 'recolor',
                        nodeValue: grandparent.value,
                        targetColor: 'red',
                        description: `${grandparent.value} → ${t('common:red')}`
                    });
                    steps.push({
                        action: 'rotate',
                        nodeValue: grandparent.value,
                        direction: 'right',
                        description: t('rbtree:guide.dragToRotate', { val: grandparent.value, dir: t('common:right') })
                    });
                } else if (isLR) {
                    caseType = t('rbtree:guide.caseLRBlack');
                    // Step 1: Left rotate parent
                    // We ONLY show the first step (Rotation). 
                    // After rotation, the tree becomes a Line Case (LL), and the system 
                    // will automatically generate the new plan (Recolor -> Rotate).
                    steps.push({
                        action: 'rotate',
                        nodeValue: parentNode.value,
                        direction: 'left',
                        description: t('rbtree:guide.dragToRotate', { val: parentNode.value, dir: t('common:left') })
                    });
                } else if (isRL) {
                    caseType = t('rbtree:guide.caseRLBlack');
                    steps.push({
                        action: 'rotate',
                        nodeValue: parentNode.value,
                        direction: 'right',
                        description: t('rbtree:guide.dragToRotate', { val: parentNode.value, dir: t('common:right') })
                    });
                }
            }
        } else if (violation.type === 'black-height') {
            // Missing DeleteFixupInfo case (e.g. after refresh or invalid state)
            // Infer the double-double position from black heights
            const parent = tree.getNodeById(violation.nodeIds[0]);
            if (!parent) return null;

            // Helper to count black height (duplicated to avoid scope issues)
            const getBH = (n: import('../structures/red-black-tree/RedBlackTree').RBNode | null): number => {
                if (!n) return 1; // Nil is black
                const l = getBH(n.left);
                const r = getBH(n.right);
                if (l === -1 || r === -1 || l !== r) return -1;
                return l + (n.color === 'black' ? 1 : 0);
            };

            const leftBH = getBH(parent.left);
            const rightBH = getBH(parent.right);

            // The side with LOWER Black Height is the Double Black side
            // Note: If one side is invalid (-1), we can't be sure, but usually the delete violation 
            // is the immediate mismatch. If leftBH < rightBH (and both validish), left is DB.
            // If we have a mismatch, we assume standard delete fixup.
            
            // Should be robust: if leftBH < rightBH, assume left deleted.
            let isLeft = false;
            // If both are -1, we can't decide, return null. The deeper violation should be prioritized by getPriorityViolation?
            // Actually getPriorityViolation just returns activeViolations[0].
            
            if (leftBH !== -1 && rightBH !== -1) {
                if (leftBH < rightBH) isLeft = true;
                else if (rightBH < leftBH) isLeft = false;
                else return null; // Equal heights? No violation here.
            } else {
                 // Fallback: This might be complex recursive violation. 
                 // Try to locate the nil/short path?
                 return null; 
            }

            // Construct inferred info
            const inferredInfo: DeleteFixupInfo = {
                needsFixup: true,
                parentId: parent.id,
                isLeftChild: isLeft,
                // We don't know the exact deleted node value or color, but standard fixup 
                // only relies on Parent, Sibling, and Nephews.
                deletedWasBlack: true // Must be true to cause BH violation
            };
            
            return computeDeleteFixPlan(inferredInfo);
        }

        if (steps.length === 0) return null;

        return {
            caseType,
            steps,
            currentStepIndex: 0,
            originalViolationNodeIds: violation.nodeIds
        };
    };

    const renderAdvice = () => {
        // Clear fix plan if tree is now valid (violations === 0) AND no fixup needed
        // We relaxed this previously, causing phantom hints. Now we tighten it but ensure we check deleteFixupInfo.
        // If tree is valid AND (no delete fixup info OR delete fixup indicates no fix needed) -> Clean.
        // Actually, if violations===0, we should assume valid UNLESS deleteFixupInfo is forcefully present.
        // But user reported "Hint didn't show" when violations was > 0 (supposedly).
        // Let's go back to strict check but handle the "Success" case explicitly.

        if (mode !== 'manual') return null;

        // If tree has no violations, clear everything immediately.
        // We trust the validator: if it says 0 violations, the tree is valid.
        if (violations.length === 0) {
            if (fixPlan) setFixPlan(null);
            if (lockedTargetId) setLockedTargetId(null);
            if (deleteFixupInfo) setDeleteFixupInfo(null);
            return null;
        }



        if (isPlaying) return null;

        // Show "Show Hint" button if hint is not visible
        if (!showHint) {
            const hasActiveFixPlan = fixPlan && fixPlan.steps.length > 0;
            const completedCount = fixPlan ? fixPlan.steps.filter(s => s.isCompleted || s.isSkipped).length : 0;
            const hasDeleteFixup = deleteFixupInfo?.needsFixup;
            return (
                <button
                    onClick={() => {
                        // Fix plan should be pre-computed; if not, compute it now
                        if (!fixPlan || fixPlan.steps.every(s => s.isCompleted || s.isSkipped)) {
                            if (hasDeleteFixup && deleteFixupInfo) {
                                const newPlan = computeDeleteFixPlan(deleteFixupInfo);
                                if (newPlan) setFixPlan(newPlan);
                            } else {
                                const newPlan = createFixPlan();
                                if (newPlan) setFixPlan(newPlan);
                            }
                        }
                        setShowHint(true);
                    }}
                    className="w-full py-3 mb-6 bg-amber-500/10 border-2 border-dashed border-amber-500/30 rounded-2xl text-amber-500 font-black text-[10px] uppercase tracking-widest animate-pulse hover:bg-amber-500/20 transition-colors"
                >
                    {hasActiveFixPlan
                        ? `${t('rbtree:guide.showHint')} (${completedCount}/${fixPlan!.steps.length})`
                        : hasDeleteFixup
                            ? t('rbtree:guide.showHintDelete')
                            : t('rbtree:guide.showHint')
                    }
                </button>
            );
        }

        // No fix plan yet - create one
        if (!fixPlan) {
            // Prioritize Delete Fixup (e.g. Red Replacement)
            if (deleteFixupInfo?.needsFixup) {
                const deletePlan = computeDeleteFixPlan(deleteFixupInfo);
                if (deletePlan) {
                    setFixPlan(deletePlan);
                    return null;
                }
            }

            const newPlan = createFixPlan();
            if (!newPlan) return null;
            setFixPlan(newPlan);
            return null; // Will render on next cycle
        }

        // Check if all steps are completed
        const allCompleted = fixPlan.steps.every(s => s.isCompleted || s.isSkipped);
        if (allCompleted) {
            // CRITICAL: First check if the tree is ACTUALLY valid now.
            // If tree.validate() returns no errors, we are done, regardless of what deleteFixupInfo says.
            // We must check this first to avoid "Phantom Hints" where deleteFixupInfo persists after a fix is done.
            const currentViolations = tree.validate();
            if (currentViolations.length === 0) {
                // SUCCESS: Tree is valid and plan done.
                setFixPlan(null);
                setDeleteFixupInfo(null);
                setLockedTargetId(null);
                return null;
            }

            // If tree is INVALID, we need a new plan.
            // 1. If we have a continuing delete fixup (Double Black case / Red Replacement)
            // This MUST take priority over standard violations because "Red Replacement" creates a temporary 
            // Red-Red violation that standard logic mistakes for "Uncle Red" insertion case.
            if (deleteFixupInfo?.needsFixup) {
                const deletePlan = computeDeleteFixPlan(deleteFixupInfo);
                if (deletePlan) {
                    setFixPlan(deletePlan);
                    return null;
                }
            }

            // 2. If no delete plan, try standard fix plan (Red-Red, Root-Red)
            const newPlan = createFixPlan();
            if (newPlan) {
                setFixPlan(newPlan);
                return null;
            }
            return null;
        }

        return (
            <div className="bg-amber-950/50 border border-amber-500/30 p-4 rounded-xl text-amber-50 mb-6 relative group shadow-2xl animate-in slide-in-from-top-2">
                <button
                    onClick={() => { setShowHint(false); }}
                    className="absolute top-2 right-2 p-1 text-amber-500/50 hover:text-amber-500 transition-colors"
                >
                    <X size={14} />
                </button>

                {/* Header with case type - LARGE */}
                <div className="flex flex-col gap-1 mb-4 border-b border-amber-700/50 pb-3">
                    <div className="flex items-center gap-2 text-amber-500/80 text-[9px] uppercase tracking-widest font-bold">
                        <Info size={14} />
                        <span>{t('rbtree:guide.currentSituation')}</span>
                    </div>
                    <div className="text-base font-black text-amber-400 leading-tight">
                        {fixPlan.caseType}
                    </div>
                    {/* Wiki Reference */}
                    <div className="text-[10px] text-amber-500/60 font-mono">
                        {t('rbtree:guide.wikiReference')}: {fixPlan.caseType}
                    </div>
                </div>

                {/* Checklist */}
                <div className="space-y-2">
                    {fixPlan.steps.map((step, idx) => {
                        const isCompleted = step.isCompleted;
                        const isSkipped = step.isSkipped;
                        const isPending = !isCompleted && !isSkipped;

                        return (
                            <div
                                key={idx}
                                className={`p-3 rounded-lg border transition-all ${isSkipped
                                    ? 'bg-slate-800/20 border-slate-700/20 opacity-60'
                                    : isCompleted
                                        ? 'bg-green-900/20 border-green-700/30'
                                        : 'bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Checkbox Icon */}
                                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isSkipped ? 'bg-slate-700 text-slate-400' :
                                        isCompleted ? 'bg-green-600 text-white' :
                                            'bg-slate-800 border-2 border-amber-500/50 text-amber-500'
                                        }`}>
                                        {isSkipped ? '—' : isCompleted ? <Check size={14} strokeWidth={4} /> : idx + 1}
                                    </div>

                                    {/* Step content */}
                                    <div className={`flex-1 ${isCompleted || isSkipped ? 'opacity-80' : ''}`}>
                                        {step.action === 'recolor' ? (
                                            <div className="text-sm">
                                                <span className={isPending ? 'text-amber-200 font-bold' : 'text-slate-400 line-through decoration-slate-600'}>
                                                    {t('rbtree:guide.clickToRecolor')}
                                                </span>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <span className="font-mono font-bold">{step.nodeValue}</span>
                                                    <span className="text-slate-500">→</span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${step.targetColor === 'black'
                                                        ? 'bg-slate-900 text-white border border-slate-600'
                                                        : 'bg-red-600 text-white'
                                                        }`}>
                                                        {step.targetColor === 'black' ? t('common:black') : t('common:red')}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm">
                                                <span className={isPending ? 'text-amber-200 font-bold' : 'text-slate-400 line-through decoration-slate-600'}>
                                                    {t('rbtree:guide.dragToRotateLabel')}
                                                </span>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <span className="text-white">{t('rbtree:guide.dragNode')}</span>
                                                    <span className="font-mono font-bold text-amber-200">{step.nodeValue}</span>
                                                    <span className="text-white">{t('rbtree:guide.toThe')}</span>
                                                    <span className={`font-bold ${step.direction === 'left' ? 'text-blue-400' : 'text-green-400'}`}>
                                                        {step.direction === 'left' ? t('common:left') : t('common:right')}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Status Badges */}
                                        <div className="mt-2 flex gap-2">
                                            {isSkipped && step.skipReason && (
                                                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                                                    {step.skipReason}
                                                </span>
                                            )}
                                            {isCompleted && !isSkipped && (
                                                <span className="text-[10px] bg-green-900/40 text-green-400 px-1.5 py-0.5 rounded border border-green-800/50">
                                                    {t('rbtree:guide.completedStep')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Pending Actions Status */}
                {(() => {
                    const pendingSteps = fixPlan.steps.filter(s => !s.isCompleted && !s.isSkipped);

                    if (pendingSteps.length === 0) {
                        return (
                            <div className="mt-4 pt-3 border-t border-green-700/30">
                                <div className="text-[10px] uppercase tracking-widest text-green-400 mb-2 font-bold">
                                    ✓ {t('rbtree:guide.allStepsComplete')}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div className="mt-4 pt-3 border-t border-amber-700/30">
                            <div className="text-[10px] uppercase tracking-widest text-amber-400 mb-2 font-bold animate-pulse">
                                👆 {t('rbtree:guide.currentAction')}
                            </div>
                            <div className="text-xs text-amber-200/60">
                                {t('rbtree:guide.performAnyPending')}
                            </div>
                        </div>
                    );
                })()}
            </div>
        );
    };



    const renderTourTooltip = () => {
        if (tourStep === -1) return null;
        const steps = [
            { title: t('rbtree:guide.ui.mode'), pos: 'top-34 left-88' },
            { title: t('rbtree:guide.ui.sidebar'), pos: 'top-1/2 left-80' },
            { title: t('rbtree:guide.ui.canvas'), pos: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' },
            { title: t('rbtree:guide.ui.action'), pos: 'bottom-26 left-88' },
            { title: t('rbtree:guide.ui.timeline'), pos: 'bottom-26 right-80' },
        ];
        const step = steps[tourStep];
        if (!step) return null;
        return (
            <div className={`fixed ${step.pos} z-[10002] bg-slate-900 text-white p-4 rounded-xl shadow-2xl max-w-xs animate-in zoom-in-95 border border-slate-700`}>
                <h4 className="font-bold mb-3 text-sm leading-relaxed">{step.title}</h4>
                <div className="flex gap-2 justify-end">
                    <button onClick={() => setTourStep(-1)} className="text-slate-400 hover:text-white text-[10px] font-bold px-2 uppercase tracking-wider">Exit</button>
                    {tourStep > 0 && <button onClick={() => setTourStep(tourStep - 1)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">Prev</button>}
                    <button onClick={() => setTourStep(tourStep < steps.length - 1 ? tourStep + 1 : -1)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider">{tourStep < steps.length - 1 ? 'Next' : 'Finish'}</button>
                </div>
            </div>
        );
    };

    const renderExtraTutorialContent = () => {
        const lesson = tutorial.currentLesson;
        const violationsContent = violations.length > 0 ? (
            <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl animate-pulse mb-3">
                <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase mb-1">
                    <AlertCircle size={14} /> Attention
                </div>
                <div className="text-red-300 text-xs">
                    {violations.map((v, i) => <div key={i}>{v.message}</div>)}
                </div>
            </div>
        ) : null;

        const hintContent = lesson?.allowHintToggle ? (
            <div className="mt-2 text-slate-300 text-xs leading-relaxed font-mono">
                {renderAdvice()}
            </div>
        ) : null;

        return (
            <div>
                {violationsContent}
                {hintContent}
            </div>
        );
    };


    return (
        <div className={`h-full w-full flex bg-slate-100 overflow-hidden relative font-sans text-slate-900 ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
             <SEO 
                title="Red-Black Tree Visualization"
                description="Interactive Red-Black Tree visualization. Understand how color properties and rotations maintain balance."
                keywords={["Red-Black Tree", "RB Tree", "Balanced Binary Search Tree", "Visualization", "Algorithm"]}
            />
            {/* FORCE DISABLE TRANSITION DURING RESIZE */}
            <style>{isResizing ? `* { transition: none !important; cursor: col-resize !important; user-select: none !important; }` : ''}</style>

            {/* FLOATING WARNING TOAST */}
            {warningToast && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[10000] bg-amber-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-amber-400 animate-in fade-in slide-in-from-top-4">
                    <AlertCircle size={20} className="shrink-0" />
                    <span className="font-bold">{warningToast}</span>
                    <X size={18} onClick={() => setWarningToast(null)} className="cursor-pointer hover:bg-white/20 rounded-full" />
                </div>
            )}

            {/* SIDEBAR */}
            <div
                style={{ width: isSidebarOpen ? (window.innerWidth > 768 ? `${sidebarWidth}px` : '100%') : '0px' }}
                className={`h-full flex flex-col bg-slate-900 border-r border-slate-800 shrink-0 z-[100] shadow-2xl relative ${!isSidebarOpen ? 'overflow-hidden' : ''} ${window.innerWidth <= 768 ? 'fixed left-0 top-0' : 'relative'} ${tourHighlight(1)}`}
            >
                {window.innerWidth <= 768 && isSidebarOpen && <button onClick={() => setIsSidebarOpen(false)} className="absolute top-4 right-4 text-white z-[110]"><PanelLeftClose size={24} /></button>}
                <div className="flex flex-col h-full w-full">
                    <div className="flex p-2 gap-1 bg-slate-950/50">
                        <button onClick={() => setActiveTab('logs')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-[9px] sm:text-[10px] font-black uppercase transition-all ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><ScrollText size={14} /><span className="hidden sm:inline">Logs</span></button>
                        <button onClick={() => setActiveTab('wiki')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-[9px] sm:text-[10px] font-black uppercase transition-all ${activeTab === 'wiki' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><BookOpen size={14} /><span className="hidden sm:inline">Wiki</span></button>
                        <button onClick={() => { setActiveTab('tutorial'); tutorial.setView('menu'); }} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-[9px] sm:text-[10px] font-black uppercase transition-all ${activeTab === 'tutorial' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><GraduationCap size={14} /><span className="hidden sm:inline">Course</span></button>
                    </div>
                    <div className="flex-grow overflow-y-auto p-4 font-mono text-[10px] text-slate-300 custom-scrollbar">
                        {activeTab === 'logs' && (
                            <div className="space-y-2">
                                {renderAdvice()}
                                <h3 className="text-slate-500 font-black uppercase tracking-[0.2em] mb-4">History</h3>
                                {history.slice(1).reverse().map((e, i) => (
                                    <button
                                        key={e.id}
                                        onClick={() => {
                                            stopPlayback();
                                            const targetIdx = history.length - 1 - i;
                                            tree.root = e.finalSnapshot ? e.finalSnapshot.clone() : null;
                                            setSnapshot(calculateLayout(e.finalSnapshot));
                                            setActiveSteps(e.steps);
                                            setCurrentStepIdx(e.steps.length - 1);
                                            setHistoryIndex(targetIdx);
                                        }}
                                        className={`w-full text-left p-3 rounded-xl border transition-all ${historyIndex === history.length - 1 - i ? 'bg-blue-600/20 border-blue-500/50 text-blue-100 shadow-inner' : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800 text-slate-400'}`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-black uppercase tracking-wider">{e.action}</span>
                                            <span className="opacity-40 text-[8px]">{e.steps.length} steps</span>
                                        </div>
                                        <div className="text-[9px] opacity-60 truncate">{e.steps[e.steps.length - 1]?.message}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {activeTab === 'wiki' && (
                            <div className="space-y-8 font-sans pb-12 text-slate-400">
                                <h3 className="text-white font-black text-xs uppercase tracking-[0.3em]">Knowledge Base</h3>
                                <section><h4 className="text-cyan-400 font-bold text-sm mb-2 uppercase">{t('rbtree:wiki.concept')}</h4><SimpleMarkdown text={t('rbtree:wiki.conceptDesc')} /></section>
                                <section><h4 className="text-slate-300 font-bold text-sm mb-2 uppercase">{t('rbtree:wiki.nilNodes')}</h4><SimpleMarkdown text={t('rbtree:wiki.nilNodesDesc')} /></section>
                                <section><h4 className="text-indigo-400 font-bold text-sm mb-2 uppercase">{t('rbtree:wiki.properties')}</h4><SimpleMarkdown text={t('rbtree:wiki.propertiesDesc')} /></section>
                                <section><h4 className="text-blue-400 font-bold text-sm mb-2 uppercase">{t('rbtree:wiki.blackHeight')}</h4><SimpleMarkdown text={t('rbtree:wiki.blackHeightDesc')} /></section>
                                <section><h4 className="text-emerald-400 font-bold text-sm mb-2 uppercase">{t('rbtree:wiki.insertion')}</h4><SimpleMarkdown text={t('rbtree:wiki.insertionDesc')} /></section>
                                <section><h4 className="text-rose-400 font-bold text-sm mb-2 uppercase">{t('rbtree:wiki.deletion')}</h4><SimpleMarkdown text={t('rbtree:wiki.deletionDesc')} /></section>
                                <section><h4 className="text-purple-400 font-bold text-sm mb-2 uppercase">{t('rbtree:wiki.complexity')}</h4><SimpleMarkdown text={t('rbtree:wiki.complexityDesc')} /></section>
                            </div>
                        )}
                        {activeTab === 'tutorial' && (
                            <TutorialView
                                {...tutorial}
                                manifest={RB_LESSONS}
                                i18nNamespace="rbtree"
                                onFinish={() => setShowCongrats(true)}
                                renderExtraContent={renderExtraTutorialContent}
                            />
                        )}
                    </div>
                </div>
                {isSidebarOpen && window.innerWidth > 768 && <div onMouseDown={startResizing} className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize z-[120] hover:bg-blue-500/50" />}
            </div>

            <div className="flex-grow flex flex-col min-w-0 h-full relative bg-white">
                {/* Canvas */}
                <div className="flex-grow relative overflow-hidden bg-grid-slate-100">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute bottom-6 left-6 z-30 w-10 h-10 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all">{isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}</button>

                    <div className={`absolute top-6 left-6 z-20 pointer-events-none flex flex-col gap-2 ${tourHighlight(0)}`}>
                        <div className="flex gap-2 pointer-events-auto">
                            <button onClick={() => setMode('auto')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${mode === 'auto' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/50 text-slate-500 hover:bg-white'}`}>Auto</button>
                            <button onClick={() => setMode('manual')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${mode === 'manual' ? 'bg-amber-500 text-white shadow-lg' : 'bg-white/50 text-slate-500 hover:bg-white'}`}>Manual</button>
                        </div>

                        {tutorial.view === 'lesson' && activeTab === 'tutorial' && (
                            <div className="bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase text-slate-500 shadow-sm border border-slate-200 pointer-events-auto">
                                Level {tutorial.lessonIndex}: {t(`rbtree:tutorial.levels.${tutorial.currentLesson.id}.title`)}
                            </div>
                        )}

                        {currentMsg && (
                            <div className={`${currentMsgType === 'error' ? 'bg-red-600/90 border-red-400' : 'bg-blue-600/90 border-blue-400'} backdrop-blur-md px-4 py-2 rounded-2xl text-white shadow-lg border flex items-center gap-2 animate-in slide-in-from-left-4`}>
                                <div className={`w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0`}></div>
                                <span className="text-xs font-black uppercase tracking-wider">{currentMsg}</span>
                            </div>
                        )}

                    </div>

                    <button onClick={() => setShowHelp(true)} className="absolute top-6 right-6 w-10 h-10 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 shadow-sm z-20"><Info size={20} /></button>

                    <TransformWrapper
                        initialScale={1}
                        minScale={0.1}
                        maxScale={2}
                        centerOnInit
                        panning={{ disabled: isHoveringNode, excluded: ["no-pan"] }}
                    >
                        {({ zoomIn, zoomOut, resetTransform }) => (
                            <>
                                <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
                                    <div className="w-[4000px] h-[4000px] relative cursor-grab active:cursor-grabbing">
                                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ overflow: 'visible' }}>
                                            {snapshot && <RedBlackNode
                                                node={snapshot}
                                                x={snapshot.x}
                                                y={snapshot.y}
                                                level={0}
                                                highlightedIds={highlightedIds}
                                                selectedId={selectedNode?.id}
                                                onNodeClick={handleNodeClick}
                                                onNodeDrag={mode === 'manual' ? handleNodeDrag : undefined}
                                                pulsingId={pulsingId}
                                                violations={violations}
                                                onMouseEnter={() => setIsHoveringNode(true)}
                                                onMouseLeave={() => setIsHoveringNode(false)}
                                            />}
                                        </div>
                                    </div>
                                </TransformComponent>

                                <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
                                    <button onClick={() => zoomIn()} className="w-10 h-10 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-white active:scale-90"><Plus size={20} /></button>
                                    <button onClick={() => zoomOut()} className="w-10 h-10 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-white active:scale-90"><Minus size={20} /></button>
                                    <button onClick={() => resetTransform()} className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 mt-2"><LocateFixed size={20} /></button>

                                </div>
                                {renderTourTooltip()}
                            </>
                        )}
                    </TransformWrapper>

                    <CongratsModal
                        show={showCongrats}
                        title="Course Completed!"
                        description="You've mastered the Red-Black Tree."
                        onClose={() => setShowCongrats(false)}
                        onBackToMenu={() => { setShowCongrats(false); tutorial.setView('menu'); }}
                        backToMenuText="Back to Menu"
                    />
                    {
                        mode === 'manual' && tutorial.view === 'menu' && !localStorage.getItem('ds-playground-avl-prerequisite-seen') && (
                            <PrerequisiteBanner structureId="rb" onDismiss={() => { }} />
                        )
                    }

                    {showHelp && (
                        <div 
                            className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) setShowHelp(false);
                            }}
                        >
                            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden relative animate-in zoom-in-95 duration-200">
                                <X onClick={() => setShowHelp(false)} className="absolute top-6 right-6 cursor-pointer text-slate-400 hover:text-slate-600 transition-colors z-10" />

                                <div className="bg-blue-600 p-6 text-white">
                                    <h3 className="text-2xl font-bold flex items-center gap-2"><HelpCircle /> {t('rbtree:guide.helpTitle')}</h3>

                                    <div className="flex gap-2 mt-4">
                                        <button onClick={() => setHelpTab('concept')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${helpTab === 'concept' ? 'bg-white text-blue-600' : 'bg-blue-700 text-blue-200 hover:bg-blue-500'}`}>Operation</button>
                                        <button onClick={() => setHelpTab('ui')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${helpTab === 'ui' ? 'bg-white text-blue-600' : 'bg-blue-700 text-blue-200 hover:bg-blue-500'}`}>Interface</button>
                                    </div>
                                </div>

                                <div className="p-8 space-y-6">
                                    {helpTab === 'concept' ? (
                                        <>
                                            <p className="text-slate-600 font-medium text-sm leading-relaxed">{t('rbtree:guide.helpDesc')}</p>
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="group flex gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-100 transition-colors hover:bg-blue-100"><div className="bg-white p-3 rounded-xl shadow-sm h-fit"><Palette className="text-blue-600" /></div><div><h4 className="font-bold text-blue-900 text-sm">{t('rbtree:guide.helpRecolor')}</h4><SimpleMarkdown text={t('rbtree:guide.helpRecolorDesc')} className="text-blue-700" /></div></div>
                                                <div className="group flex gap-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 transition-colors hover:bg-indigo-100"><div className="bg-white p-3 rounded-xl shadow-sm h-fit"><Undo2 className="text-indigo-600" /></div><div><h4 className="font-bold text-indigo-900 text-sm">{t('rbtree:guide.helpRotate')}</h4><SimpleMarkdown text={t('rbtree:guide.helpRotateDesc')} className="text-sm text-indigo-700" /></div></div>
                                            </div>
                                            <button onClick={() => setHelpTab('ui')} className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold hover:bg-slate-200 active:scale-95 transition-all mt-6 text-xs uppercase tracking-widest">Next: Interface Guide</button>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-6 py-4">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                                                <Sparkles size={48} className="text-blue-500 relative z-10" />
                                            </div>
                                            <div className="text-center space-y-2">
                                                <h4 className="font-bold text-slate-900 text-lg">{t('rbtree:guide.ui.start')}</h4>
                                                <p className="text-sm text-slate-500 max-w-xs mx-auto">{t('rbtree:guide.ui.startDesc')}</p>
                                            </div>
                                            <button onClick={() => { setShowHelp(false); setTourStep(0); }} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center gap-2">
                                                {t('rbtree:guide.ui.startBtn')} <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    {renderTourTooltip()}
                </div >

                {/* Bottom Bar */}
                <div className="bg-white border-t border-slate-200 p-3 sm:p-4 flex flex-col lg:flex-row gap-4 lg:gap-4 items-stretch overflow-visible shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-[100]">
                    <ControlIsland label="Operations" className={`w-full lg:w-[320px] ${tourHighlight(3)}`}>
                        <div className="grid grid-cols-[1fr_auto] gap-2 w-full">
                            <div className="flex gap-2 items-center bg-white p-1 rounded-xl border border-slate-200 flex-grow overflow-hidden shadow-sm">
                                <input value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleInsert()} className="flex-grow min-w-0 px-2 text-xs font-bold outline-none text-center" placeholder="Val" />
                                <button onClick={handleInsert} disabled={isPlaying} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-black shadow-md shrink-0 active:scale-95 transition-all">INSERT</button>
                            </div>
                            <button onClick={handleDelete} disabled={isPlaying} className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-[11px] font-black shadow-lg flex items-center gap-2 active:scale-95 transition-all shrink-0">
                                <Trash2 size={14} /> DELETE
                            </button>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 font-bold">Delete Strategy:</span>
                            <button
                                onClick={() => setDeletionStrategy(deletionStrategy === 'successor' ? 'predecessor' : 'successor')}
                                className="flex-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold transition-all text-[10px] uppercase tracking-wider"
                            >
                                {deletionStrategy === 'successor' ? '📍 Inorder Successor' : '📍 Inorder Predecessor'}
                            </button>
                        </div>
                        <button onClick={handleClear} disabled={isPlaying} className={`w-full flex items-center justify-center gap-2 py-1.5 border border-dashed text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${resetConfirm ? 'bg-red-600 border-red-600 text-white animate-bounce' : 'border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500'}`}><RefreshCw size={12} className={resetConfirm ? 'animate-spin' : ''} /> {resetConfirm ? 'Confirm Reset?' : 'Reset Playground'}</button>
                    </ControlIsland>

                    <ControlIsland label="Timeline" className={`flex-grow ${tourHighlight(4)}`} metadata={`Step ${Math.max(0, currentStepIdx + 1)} / ${activeSteps.length}`}>
                        <PlaybackControls
                            isPlaying={isPlaying}
                            isPaused={!isPlaying}
                            onTogglePause={() => isPlaying ? stopPlayback() : startPlayback(activeSteps.length, currentStepIdx)}
                            onGoToStep={goToStep}
                            currentStep={currentStepIdx}
                            totalSteps={activeSteps.length}
                            onUndo={handleUndo}
                            onRedo={handleRedo}
                            canUndo={historyIndex > 0}
                            canRedo={historyIndex < history.length - 1}
                            playbackSpeed={playbackSpeed}
                            setPlaybackSpeed={setPlaybackSpeed}
                        />
                    </ControlIsland>
                </div >
            </div >
        </div >
    );
};
