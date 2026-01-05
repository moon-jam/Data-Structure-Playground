import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AVLTree, AVLNode } from '../structures/avl-tree/AVLTree';
import { TreeNode } from '../components/TreeNode';
import type { VisualizationStep } from '../structures/common/types';
import { 
  Info, Undo2, Redo2, HelpCircle, X, AlertCircle, 
  BookOpen, ScrollText, Trash2, Pause, Play, 
  ChevronLeft, ChevronRight, SkipBack, SkipForward, Timer, RefreshCw,
  Plus, Minus, LocateFixed, PanelLeftClose, PanelLeft, GraduationCap, Trophy, Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

// --- ULTIMATE STABLE MINI MARKDOWN ENGINE ---
const SimpleMarkdown = ({ text, className = '', onLinkClick }: { text: string | null | undefined, className?: string, onLinkClick?: (target: string) => void }) => {
  if (!text) return null;
  const renderInline = (input: string) => {
    const parts = input.split(/(\$\*[\s\S]+?\$|\*\*[\s\S]+?\*\*|\`[\s\S]+?\`|\*[\s\S]+?\*|\[\[[\s\S]+?\]\])/g);
    
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-extrabold text-amber-400 mx-0.5">{part.slice(2, -2)}</strong>;
      if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="bg-slate-950 px-1.5 py-0.5 rounded text-blue-300 font-mono text-[11px] border border-slate-700/50 mx-0.5 inline-block leading-none shadow-inner">{part.slice(1, -1)}</code>;
      if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="italic text-slate-300 opacity-80 mx-0.5">{part.slice(1, -1)}</em>;
      if (part.startsWith('[[') && part.endsWith(']]')) {
          const [label, target] = part.slice(2, -2).split('|');
          return (<button key={i} onClick={() => onLinkClick?.(target)} className="text-blue-400 font-black border-b border-blue-400/30 hover:text-blue-300 transition-all cursor-pointer mx-0.5">{label}</button>);
      }
      return part;
    });
  };

  const lines = text.split('\n');
  return (<div className={`${className} space-y-2 text-[13px]`}>{lines.map((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={lineIdx} className="h-2" />;
    if (trimmed.startsWith('|')) {
        if (trimmed.includes('---')) return null;
        const cells = trimmed.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
        const isHeader = (lineIdx === 0) || (lines[lineIdx+1] && lines[lineIdx+1].includes('---'));
        return (<div key={lineIdx} className={`flex border-b border-slate-800 py-2 gap-4 transition-colors ${isHeader ? 'bg-white/5 font-bold border-b-2 border-slate-700' : 'hover:bg-white/5'}`}>{cells.map((cell, cIdx) => (<div key={cIdx} className={`flex-1 px-2 text-sm ${isHeader ? 'text-slate-100' : 'text-slate-400'} break-words`}>{renderInline(cell.trim())}</div>))}
</div>);
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) { return (<div key={lineIdx} className="flex gap-3 pl-2 py-0.5"><span className="text-blue-500 font-black text-xs">•</span><div className="flex-grow leading-relaxed">{renderInline(line.trim().substring(2))}</div></div>); } 
    return (<div key={lineIdx} className="leading-relaxed py-0.5">{renderInline(line)}</div>);
  })}</div>);
};

interface HistoryEntry { id: string; action: string; steps: VisualizationStep[]; finalSnapshot: string; } 

type LessonType = 'concept' | 'quiz' | 'guided' | 'challenge';
interface Lesson {
    id: string;
    type: LessonType;
    setup: (tree: AVLTree) => void;
    targetVal?: number; // For Quiz/Concept to identify the target node
    answer?: number;    // For Quiz answer
    check?: (tree: AVLTree) => boolean;
}

const LESSONS: Lesson[] = [
    {   // L1: Height - Click Height 2
        id: 'l1', type: 'concept', 
        setup: (tree) => { [20, 10, 30, 5].forEach(v => tree.insertManual(v)); }, // Root 20 has Internal H=3 (Display H=2)
        targetVal: 20 // The root has height 2 (Display)
    },
    {   // L2: BF Quiz
        id: 'l2', type: 'quiz',
        setup: (tree) => { [30, 20, 10].forEach(v => tree.insertManual(v)); }, // 30->20->10. BF(30) = 2 - 0 = 2.
        targetVal: 30,
        answer: 2
    },
    {   // L3: LL Guided
        id: 'l3', type: 'guided',
        setup: (tree) => { [50, 30, 60, 20, 40, 10].forEach(v => tree.insertManual(v)); } // 50 LL. Observe Node 40.
    },
    {   // L4: Challenge (RR)
        id: 'l4', type: 'challenge',
        setup: (tree) => { [20, 10, 50, 30, 60, 70].forEach(v => tree.insertManual(v)); } // 20 RR. Observe Node 30.
    },
    {   // L5: LR Guided
        id: 'l5', type: 'guided',
        setup: (tree) => { [50, 20, 80, 10, 30].forEach(v => tree.insertManual(v)); tree.insertManual(25); }
    },
    {   // L6: Challenge (RL)
        id: 'l6', type: 'challenge',
        setup: (tree) => { [50, 20, 80, 70, 90].forEach(v => tree.insertManual(v)); tree.insertManual(75); }
    },
    {   // L7: Deletion Guided
        id: 'l7', type: 'guided',
        setup: (tree) => { [20, 10, 30, 25, 40].forEach(v => tree.insertManual(v)); },
        targetVal: 10,
        check: (tree) => {
             const find = (n: AVLNode | null, v: number): boolean => {
                 if (!n) return false;
                 if (n.value === v) return true;
                 return find(n.left, v) || find(n.right, v);
             };
             return !find(tree.root, 10);
        }
    }
];

export const AVLTreePage: React.FC = () => {
  const { t } = useTranslation(['common', 'avl'], { useSuspense: false });
  const [avlTree] = useState(() => new AVLTree());
  
  // Basic States
  const [root, setRoot] = useState<AVLNode | null>(null);
  const [unbalancedData, setUnbalancedData] = useState<{allIds: string[], lowestId: string | null}>({ allIds: [], lowestId: null });
  const [selectedNode, setSelectedNode] = useState<AVLNode | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [activeTab, setActiveTab] = useState<'logs' | 'wiki' | 'tutorial'>('logs');
  
  // UI States
  const [showHelp, setShowHelp] = useState(false);
  const [helpTab, setHelpTab] = useState<'concept' | 'ui'>('concept');
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [warningToast, setWarningToast] = useState<string | null>(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isHoveringNode, setIsHoveringNode] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [pulsingId, setPulsingId] = useState<string | null>(null);
  const [lockedTargetId, setLockedTargetId] = useState<string | null>(null);
  
  // Sidebar/Layout States
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const wikiBfRef = useRef<HTMLDivElement>(null);

  // History & Timeline
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeOpSteps, setActiveOpSteps] = useState<VisualizationStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [currentStepMsg, setCurrentStepMsg] = useState<string | null>(null);
  const [lessonIndex, setLessonIndex] = useState(0);
  
  // Tutorial States
  const [tutorialView, setTutorialView] = useState<'menu' | 'lesson'>('menu');
  const [maxUnlocked, setMaxUnlocked] = useState(0); 
  const [quizInput, setQuizInput] = useState('');
  const [showQuizFeedback, setShowQuizFeedback] = useState<'correct'|'wrong'|null>(null);
  const [showCongrats, setShowCongrats] = useState(false);
  
  // Tour State
  const [tourStep, setTourStep] = useState(-1);
  const tourHighlight = (step: number) => tourStep === step ? 'z-[10001] relative ring-4 ring-yellow-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]' : '';
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseRef = useRef(false);

  // Resize Handlers
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
        const newWidth = e.clientX;
        if (newWidth >= 320 && newWidth < 600) setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  useEffect(() => { window.addEventListener('mousemove', resize); window.addEventListener('mouseup', stopResizing);
    return () => { window.removeEventListener('mousemove', resize); window.removeEventListener('mouseup', stopResizing); };
  }, [resize, stopResizing]);

  useEffect(() => {
    if (historyIndex === -1) {
      setHistory([{ id: 'init', action: 'Initial', steps: [], finalSnapshot: 'null' }]);
      setHistoryIndex(0);
      const savedMax = localStorage.getItem('ds-playground-avl-max-level');
      if (savedMax) setMaxUnlocked(parseInt(savedMax));
      else if (localStorage.getItem('ds-playground-avl-tree-completed') === 'true') setMaxUnlocked(LESSONS.length);
      
      const isCompleted = localStorage.getItem('ds-playground-avl-tree-completed') === 'true';
      if (!isCompleted && !savedMax) { setShowHelp(true); setActiveTab('tutorial'); }
    }
  }, []);

    // Level Completion Monitor

    useEffect(() => {

        if (tutorialView === 'lesson' && !isPlaying && lessonIndex < LESSONS.length) {

            const lesson = LESSONS[lessonIndex];

            let done = false;

            

            if (lesson.type === 'concept') {

                if (selectedNode && lesson.targetVal && selectedNode.value === lesson.targetVal) done = true;

            } else if (lesson.type === 'guided' || lesson.type === 'challenge') {

                const isBalanced = unbalancedData.allIds.length === 0;

                const hasAction = historyIndex > 0;

                const customCheck = lesson.check ? lesson.check(avlTree) : true;

                

                if (isBalanced && hasAction && customCheck) done = true;

            }

            

            if (done && lessonIndex >= maxUnlocked) {

                const next = lessonIndex + 1;

                setMaxUnlocked(next);

                localStorage.setItem('ds-playground-avl-max-level', next.toString());

                if (next === LESSONS.length) localStorage.setItem('ds-playground-avl-tree-completed', 'true');

            }

        }

    }, [tutorialView, lessonIndex, selectedNode, unbalancedData, historyIndex, maxUnlocked, isPlaying]);

  useEffect(() => {
    if (activeOpSteps.length > 0 && currentStepIdx >= 0) {
        const step = activeOpSteps[currentStepIdx];
        if (step.payload?.rootSnapshot !== undefined) {
            setRoot(step.payload.rootSnapshot);
            if (mode === 'manual') setUnbalancedData(avlTree.checkBalance(step.payload.rootSnapshot));
            else setUnbalancedData({ allIds: [], lowestId: null });
        }
        setHighlightedIds(step.targetIds || []);
        setCurrentStepMsg(step.message || null);
    }
  }, [currentStepIdx, activeOpSteps, mode, avlTree]);

  useEffect(() => { if (errorToast) { const timer = setTimeout(() => setErrorToast(null), 3000); return () => clearTimeout(timer); } }, [errorToast]);
  useEffect(() => { if (warningToast) { const timer = setTimeout(() => setWarningToast(null), 5000); return () => clearTimeout(timer); } }, [warningToast]);
  useEffect(() => { if (resetConfirm) { const timer = setTimeout(() => setResetConfirm(false), 3000); return () => clearTimeout(timer); } }, [resetConfirm]);

  const startPlayback = (count: number, startAt = 0) => {
      stopPlayback(); setIsPlaying(true); setIsPaused(false); pauseRef.current = false;
      let idx = startAt;
      const play = () => {
          if (idx < count - 1) {
              if (pauseRef.current) return;
              idx++; setCurrentStepIdx(idx);
              const duration = (activeOpSteps[idx]?.type === 'rotate' ? 1500 : 800) / playbackSpeed;
              timerRef.current = setTimeout(play, duration);
          } else { setIsPlaying(false); }
      };
      play();
  };

  const stopPlayback = () => { if (timerRef.current) clearTimeout(timerRef.current); setIsPlaying(false); setIsPaused(false); pauseRef.current = false; };
  const togglePause = () => { if (!isPlaying && activeOpSteps.length > 0) { startPlayback(activeOpSteps.length, currentStepIdx); return; } pauseRef.current = !pauseRef.current; setIsPaused(pauseRef.current); if (!pauseRef.current) startPlayback(activeOpSteps.length, currentStepIdx); };
  const goToStep = (idx: number) => { stopPlayback(); if (idx >= 0 && idx < activeOpSteps.length) setCurrentStepIdx(idx); };

  const startNewOperation = (action: string, steps: VisualizationStep[]) => {
      stopPlayback();
      const errorStep = steps.find(s => s.type === 'error');
      if (errorStep) { setErrorToast(String(t(errorStep.message?.replace('error.', 'avl:error.') || 'Error', errorStep.payload))); return; }
      setShowHint(false); setPulsingId(null); setActiveOpSteps(steps); setCurrentStepIdx(0);
      const newEntry: HistoryEntry = { id: Math.random().toString(36).substr(2, 9), action, steps, finalSnapshot: avlTree.toJSON() };
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newEntry); setHistory(newHistory); setHistoryIndex(newHistory.length - 1);
      startPlayback(steps.length);
  };

  const handleInsert = () => { if (isPlaying) return; const val = parseInt(inputValue); if (!isNaN(val)) { startNewOperation(`${t('insert')} ${val}`, mode === 'manual' ? avlTree.insertManual(val) : avlTree.insert(val)); setInputValue(''); } };
  const handleDelete = () => { if (isPlaying) return; const val = selectedNode ? selectedNode.value : parseInt(inputValue); if (!isNaN(val)) { startNewOperation(`${t('delete')} ${val}`, mode === 'manual' ? avlTree.deleteManual(val) : avlTree.delete(val)); setInputValue(''); setSelectedNode(null); } };
  
  // Heuristic: Prioritize Parent over Child if they share the same imbalance sign (fixing Double Rotation blocking loop)
  const getPriorityUnbalancedNode = (): { id: string, reason: 'lowest' | 'heuristic' } | null => {
      if (!unbalancedData.lowestId) return null;
      if (lockedTargetId && unbalancedData.allIds.includes(lockedTargetId)) return { id: lockedTargetId, reason: 'heuristic' };
      const lowestNode = avlTree.getNodeById(unbalancedData.lowestId);
      if (lowestNode) {
          const parent = avlTree.findParent(root, lowestNode.value);
          if (parent && unbalancedData.allIds.includes(parent.id)) {
              const bfLowest = avlTree.getBalance(lowestNode);
              const bfParent = avlTree.getBalance(parent);
              if (bfLowest * bfParent > 0) return { id: parent.id, reason: 'heuristic' };
          }
      }
      return { id: unbalancedData.lowestId, reason: 'lowest' };
  };

  const handleNodeDrag = (node: AVLNode, direction: 'left' | 'right') => {
      if (isPlaying) return;
      if (mode === 'manual' && unbalancedData.allIds.length > 0) {
          const target = getPriorityUnbalancedNode();
          if (unbalancedData.allIds.includes(node.id)) {
             if (target && node.id !== target.id) {
                 const targetNode = avlTree.getNodeById(target.id);
                 const msg = target.reason === 'heuristic' ? t('avl:guide.heuristicWarning') : t('avl:guide.lowestWarning');
                 setWarningToast(msg + ` (${t('avl:guide.recommendedTarget', {val: targetNode?.value})})`);
             }
          }
      }
      startNewOperation(`${direction === 'left' ? t('avl:left') : t('avl:right')} @ ${node.value}`, avlTree.rotateNode(node.value, direction));
  };

  const handleUndo = () => {
      if (historyIndex <= 0 || isPlaying) return;
      stopPlayback(); const targetIdx = historyIndex - 1; const entry = history[targetIdx];
      avlTree.fromJSON(entry.finalSnapshot); setRoot(avlTree.root ? avlTree.root.clone() : null);
      setActiveOpSteps(entry.steps); setCurrentStepIdx(entry.steps.length > 0 ? entry.steps.length - 1 : -1);
      setHistoryIndex(targetIdx); setUnbalancedData(mode === 'manual' ? avlTree.checkBalance(avlTree.root) : { allIds: [], lowestId: null });
      setShowHint(false); setLockedTargetId(null);
  };

  const handleRedo = () => {
      if (historyIndex >= history.length - 1 || isPlaying) return;
      stopPlayback(); const targetIdx = historyIndex + 1; const entry = history[targetIdx];
      setHistoryIndex(targetIdx); setActiveOpSteps(entry.steps); setCurrentStepIdx(0); startPlayback(entry.steps.length); setShowHint(false);
  };

  const handleClear = () => {
    if (!resetConfirm) { setResetConfirm(true); return; }
    setResetConfirm(false); if (isPlaying) stopPlayback();
    avlTree.root = null; setRoot(null); setUnbalancedData({ allIds: [], lowestId: null }); setSelectedNode(null);
    setHistory([{ id: 'init', action: 'Cleared', steps: [], finalSnapshot: 'null' }]);
    setHistoryIndex(0); setActiveOpSteps([]); setCurrentStepIdx(-1);
    setShowHint(false); setLockedTargetId(null); setPulsingId(null);
  };

  const runLesson = async (index: number) => {
      setLessonIndex(index);
      setTutorialView('lesson');
      setQuizInput('');
      setShowQuizFeedback(null);
      
      avlTree.root = null; setRoot(null); setUnbalancedData({ allIds: [], lowestId: null }); setSelectedNode(null);
      setHistory([{ id: 'init', action: 'Lesson Start', steps: [], finalSnapshot: 'null' }]);
      setHistoryIndex(0); setActiveOpSteps([]); setCurrentStepIdx(-1);
      setActiveTab('tutorial'); setMode('manual');
      
      if (index < LESSONS.length) {
          LESSONS[index].setup(avlTree);
          updateViewDirectly(avlTree.root);
          
          if (LESSONS[index].targetVal) {
              const findId = (n: AVLNode | null, v: number): string | null => {
                  if (!n) return null;
                  if (n.value === v) return n.id;
                  return findId(n.left, v) || findId(n.right, v);
              };
              const targetId = findId(avlTree.root, LESSONS[index].targetVal);
              if (targetId) setPulsingId(targetId);
          }

          // Auto-show hint for Guided lessons
          setShowHint(LESSONS[index].type === 'guided');
      }
  };

  const updateViewDirectly = (node: AVLNode | null) => { setRoot(node ? node.clone() : null); setUnbalancedData(avlTree.checkBalance(node)); };

  const handleLinkClick = (target: string) => {
      if (target === 'bf') {
          setActiveTab('wiki');
          setTimeout(() => {
              wikiBfRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              wikiBfRef.current?.classList.add('ring-2', 'ring-blue-500', 'ring-offset-4', 'ring-offset-slate-900');
              setTimeout(() => wikiBfRef.current?.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-4', 'ring-offset-slate-900'), 2000);
          }, 100);
      }
  };

  const renderTutorial = () => {
      if (activeTab !== 'tutorial') return null;

      if (tutorialView === 'menu') {
          return (
              <div className="space-y-4 animate-in fade-in">
                  <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                      <h3 className="text-white font-bold mb-1">{t('avl:tutorial.title')}</h3>
                      <p className="text-xs text-slate-400">{t('avl:tutorial.welcome')}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      {LESSONS.map((l, idx) => {
                          const isLocked = idx > maxUnlocked;
                          const isCompleted = idx < maxUnlocked;
                          return (
                              <button 
                                  key={l.id} 
                                  onClick={() => !isLocked && runLesson(idx)}
                                  disabled={isLocked}
                                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                                      isLocked 
                                        ? 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed' 
                                        : 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-blue-500/50'
                                  }`}
                              >
                                  <div className="flex justify-between items-start mb-2 relative z-10">
                                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                                          isLocked ? 'bg-slate-800 text-slate-600' : 
                                          isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-blue-600 text-white'
                                      }`}>
                                          L{idx + 1}
                                      </span>
                                      {isCompleted && <Trophy size={14} className="text-green-500" />}
                                      {isLocked && <div className="text-slate-600">🔒</div>}
                                  </div>
                                  <div className={`text-xs font-bold leading-tight relative z-10 ${isLocked ? 'text-slate-600' : 'text-slate-300'}`}>
                                      {t(`avl:tutorial.levels.${l.id}.title`)}
                                  </div>
                              </button>
                          );
                      })}
                  </div>
                  
                  {maxUnlocked > 0 && (
                      <button 
                          onClick={() => {
                              if (window.confirm('Reset all course progress?')) {
                                  localStorage.removeItem('ds-playground-avl-max-level');
                                  localStorage.removeItem('ds-playground-avl-tree-completed');
                                  setMaxUnlocked(0);
                              }
                          }}
                          className="w-full py-3 mt-2 text-[10px] font-bold text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-xl transition-colors uppercase tracking-widest flex items-center justify-center gap-2 border border-transparent hover:border-red-900/30"
                      >
                          <Trash2 size={12} /> Reset Progress
                      </button>
                  )}
              </div>
          );
      }

      const lesson = LESSONS[lessonIndex];
      const isDone = maxUnlocked > lessonIndex; 

      return (
          <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="flex items-center gap-2 mb-4">
                  <button onClick={() => setTutorialView('menu')} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">LEVEL {lessonIndex + 1}</span>
              </div>
              
              <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white leading-tight">{t(`avl:tutorial.levels.${lesson.id}.title`)}</h3>
                  <SimpleMarkdown text={t(`avl:tutorial.levels.${lesson.id}.desc`)} className="text-slate-400" onLinkClick={handleLinkClick} />
                  
                  {lesson.type === 'quiz' && !isDone && (
                      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
                          <p className="text-sm font-bold text-slate-300">{t('avl:tutorial.quiz.bfQuestion', {val: lesson.targetVal})}</p>
                          <div className="flex gap-2">
                              <input 
                                  type="number" 
                                  value={quizInput}
                                  onChange={(e) => setQuizInput(e.target.value)}
                                  className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-center outline-none focus:border-blue-500"
                                  placeholder="?"
                              />
                              <button 
                                  onClick={() => {
                                      if (parseInt(quizInput) === lesson.answer) {
                                          setShowQuizFeedback('correct');
                                          const next = lessonIndex + 1;
                                          if (next > maxUnlocked) {
                                              setMaxUnlocked(next);
                                              localStorage.setItem('ds-playground-avl-max-level', next.toString());
                                          }
                                      } else {
                                          setShowQuizFeedback('wrong');
                                      }
                                  }}
                                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-blue-500"
                              >
                                  {t('avl:tutorial.quiz.submit')}
                              </button>
                          </div>
                          {showQuizFeedback === 'correct' && <div className="text-green-400 text-xs font-bold flex items-center gap-1"><Sparkles size={12}/> {t('avl:tutorial.quiz.correct')}</div>}
                          {showQuizFeedback === 'wrong' && <div className="text-red-400 text-xs font-bold">{t('avl:tutorial.quiz.wrong', {lh: '?', rh: '?', ans: '?'})}</div>} 
                      </div>
                  )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-800">
                  <button onClick={() => runLesson(lessonIndex)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-700 transition-colors">{t('avl:tutorial.reset')}</button>
                  {isDone && (
                      lessonIndex < LESSONS.length - 1 ? (
                        <button onClick={() => runLesson(lessonIndex + 1)} className="flex-[2] py-3 bg-green-600 text-white rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 hover:bg-green-500 shadow-lg shadow-green-900/20">
                            {t('avl:tutorial.next')} <Sparkles size={14} />
                        </button>
                      ) : (
                        <button onClick={() => setShowCongrats(true)} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase flex items-center justify-center gap-2 hover:bg-blue-500 shadow-lg shadow-blue-900/20 animate-bounce">
                            {t('avl:tutorial.finishBtn')} <Trophy size={14} />
                        </button>
                      )
                  )}
              </div>
          </div>
      );
  };

  const renderCongrats = () => {
      if (!showCongrats) return null;
      return (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 bg-yellow-100 text-yellow-500 rounded-full flex items-center justify-center mx-auto ring-8 ring-yellow-50">
                      <Trophy size={40} />
                  </div>
                  <div className="space-y-2">
                      <h2 className="text-3xl font-black text-slate-900">{t('avl:tutorial.congratsTitle')}</h2>
                      <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-line">{t('avl:tutorial.congratsDesc')}</p>
                  </div>
                  <div className="pt-4 space-y-3">
                      <button 
                          onClick={() => { setShowCongrats(false); setTutorialView('menu'); }}
                          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-500/20"
                      >
                          {t('avl:tutorial.backToMenu')}
                      </button>
                      <button 
                          onClick={() => setShowCongrats(false)}
                          className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors text-xs uppercase tracking-widest"
                      >
                          Close
                      </button>
                  </div>
              </div>
          </div>
      );
  };

  const renderAdvice = () => {
      if (mode !== 'manual' || unbalancedData.allIds.length === 0 || isPlaying) { if (pulsingId) setPulsingId(null); if (lockedTargetId) setLockedTargetId(null); return null; }
      if (!showHint) { if (pulsingId) setPulsingId(null); return (<button onClick={() => setShowHint(true)} className="w-full py-3 mb-6 bg-amber-500/10 border-2 border-dashed border-amber-500/30 rounded-2xl text-amber-500 font-black text-[10px] uppercase tracking-widest animate-pulse">{t('avl:guide.showHint')}</button>); }
      const target = getPriorityUnbalancedNode();
      if (!target) return null;
      const targetId = target.id;
      
      if (targetId !== lockedTargetId) setLockedTargetId(targetId);
      const node = avlTree.getNodeById(targetId);
      if (!node) return null;
      const bf = avlTree.getBalance(node);
      let content, title = '';
      if (bf > 1) {
          const lNode = node.left;
          if (avlTree.getBalance(lNode) >= 0) { 
              title = t('avl:guide.caseLL'); 
              content = <SimpleMarkdown text={t('avl:guide.actionLL', {val: node.value})} />; 
              if (pulsingId !== node.id) setPulsingId(node.id); 
          } 
          else { 
              title = t('avl:guide.caseLR'); 
              content = <div className="space-y-2 text-sm"><div className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded inline-block uppercase mb-1">Step 1 of 2</div><SimpleMarkdown text={t('avl:guide.actionLR_step1', {childVal: lNode?.value})} /></div>; 
              if (lNode && pulsingId !== lNode.id) setPulsingId(lNode.id); 
          } 
      } else if (bf < -1) {
          const rNode = node.right;
          if (avlTree.getBalance(rNode) <= 0) { 
              title = t('avl:guide.caseRR'); 
              content = <SimpleMarkdown text={t('avl:guide.actionRR', {val: node.value})} />; 
              if (pulsingId !== node.id) setPulsingId(node.id); 
          } 
          else { 
              title = t('avl:guide.caseRL'); 
              content = <div className="space-y-2 text-sm"><div className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded inline-block uppercase mb-1">Step 1 of 2</div><SimpleMarkdown text={t('avl:guide.actionRL_step1', {childVal: rNode?.value})} /></div>; 
              if (rNode && pulsingId !== rNode.id) setPulsingId(rNode.id); 
          } 
      }
      return (
          <div className="bg-amber-950/50 border border-amber-500/30 p-4 rounded-xl text-amber-50 mb-6 relative group shadow-2xl animate-in slide-in-from-top-2">
              <button onClick={() => { setShowHint(false); setPulsingId(null); setLockedTargetId(null); }} className="absolute top-2 right-2 p-1 text-amber-500/50 hover:text-amber-500 transition-colors"><X size={14} /></button>
              <div className="flex items-center gap-2 mb-2 text-amber-400 font-bold border-b border-amber-700/50 pb-2"><Info size={18} /><span>Advice</span></div>
              <div className="mb-2 py-1 px-2 bg-blue-500/20 text-blue-300 text-[8px] font-black rounded border border-blue-500/30 inline-block uppercase tracking-widest">Focus: Node {node.value}</div>
              <h4 className="font-bold text-amber-200 mb-2">{title}</h4>
              <div className="text-sm leading-relaxed">{content}</div>
          </div>
      );
  };

  const renderTourTooltip = () => {
      if (tourStep === -1) return null;
      const steps = [
          { title: t('avl:guide.ui.mode'), pos: 'top-34 left-88' },
          { title: t('avl:guide.ui.sidebar'), pos: 'top-1/2 left-80' },
          { title: t('avl:guide.ui.canvas'), pos: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' },
          { title: t('avl:guide.ui.action'), pos: 'bottom-26 left-88' },
          { title: t('avl:guide.ui.timeline'), pos: 'bottom-26 right-80' },
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

  return (
    <div className={`h-full w-full flex bg-slate-100 overflow-hidden relative font-sans text-slate-900 ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      {/* FORCE DISABLE TRANSITION DURING RESIZE */}
      <style>{isResizing ? `* { transition: none !important; cursor: col-resize !important; user-select: none !important; }` : ''}</style>
      
      {errorToast && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[10000] bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-red-400 animate-in fade-in slide-in-from-top-4">
            <AlertCircle size={20} className="shrink-0" />
            <SimpleMarkdown text={errorToast} className="text-white font-bold" />
            <X size={18} onClick={() => setErrorToast(null)} className="cursor-pointer hover:bg-white/20 rounded-full" />
        </div>
      )}
      {warningToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[9999] bg-amber-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-amber-400 animate-in fade-in slide-in-from-top-4">
            <Info size={20} className="shrink-0" />
            <SimpleMarkdown text={warningToast} className="text-white font-bold" />
            <X size={18} onClick={() => setWarningToast(null)} className="cursor-pointer hover:bg-white/20 rounded-full" />
        </div>
      )}

      {/* SIDEBAR */}
      <div 
        style={{ 
            width: isSidebarOpen ? (window.innerWidth > 768 ? `${sidebarWidth}px` : '100%') : '0px',
            transition: isResizing ? 'none' : 'width 300ms ease-in-out'
        }}
        className={`h-full flex flex-col bg-slate-900 border-r border-slate-800 shrink-0 z-[100] shadow-2xl relative ${!isSidebarOpen ? 'overflow-hidden' : ''} ${window.innerWidth <= 768 ? 'fixed left-0 top-0' : 'relative'} ${tourHighlight(1)}`}
      >
          {window.innerWidth <= 768 && isSidebarOpen && <button onClick={() => setIsSidebarOpen(false)} className="absolute top-4 right-4 text-white z-[110]"><X size={24} /></button>}
          <div className="flex flex-col h-full min-w-[280px]">
              <div className="flex p-2 gap-1 bg-slate-950/50 min-w-[320px]">
                  <button onClick={() => setActiveTab('logs')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><ScrollText size={14} /> Logs</button>
                  <button onClick={() => setActiveTab('wiki')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all ${activeTab === 'wiki' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><BookOpen size={14} /> Wiki</button>
                  <button onClick={() => runLesson(0)} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all ${activeTab === 'tutorial' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><GraduationCap size={14} /> Course</button>
              </div>
              <div className="flex-grow overflow-y-auto p-4 font-mono text-[10px] text-slate-300 custom-scrollbar min-w-[320px]">
                  {activeTab === 'logs' && (<div className="space-y-2"><h3 className="text-slate-500 font-black uppercase tracking-[0.2em] mb-4">History</h3>{renderAdvice()}{history.slice(1).reverse().map((e, i) => (<button key={e.id} onClick={() => { stopPlayback(); setActiveOpSteps(e.steps); setCurrentStepIdx(e.steps.length - 1); setHistoryIndex(history.length - 1 - i); }} className={`w-full text-left p-3 rounded-xl border transition-all ${historyIndex === history.length - 1 - i ? 'bg-blue-600/20 border-blue-500/50 text-blue-100 shadow-inner' : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800 text-slate-400'}`}><div className="flex justify-between items-center mb-1"><span className="font-black uppercase tracking-wider">{e.action}</span><span className="opacity-40 text-[8px]">{e.steps.length} steps</span></div><div className="text-[9px] opacity-60 truncate">{e.steps[e.steps.length-1]?.message}</div></button>))}
</div>)}
                  {activeTab === 'wiki' && (
                    <div className="space-y-8 font-sans pb-12 text-slate-400">
                      <h3 className="text-white font-black text-xs uppercase tracking-[0.3em]">Knowledge Base</h3>
                      <section><h4 className="text-blue-400 font-bold text-sm mb-2 uppercase">Definition</h4><SimpleMarkdown text={t('avl:wiki.conceptDesc')} /></section>
                      <div ref={wikiBfRef} className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 text-center transition-all duration-500"><code className="text-blue-400 font-bold text-sm">BF = H(L) - H(R)</code></div>
                      <section><h4 className="text-amber-400 font-bold text-sm mb-2 uppercase">Deletion</h4><SimpleMarkdown text={t('avl:wiki.deletionDesc')} /></section>
                      <section className="space-y-3"><h4 className="text-indigo-400 font-bold text-sm mb-2 uppercase">Strategies</h4><div className="grid gap-3">{[ 'LL', 'RR', 'LR', 'RL' ].map(c => (<div key={c} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50"><div className="text-white font-bold text-xs mb-1">{t(`avl:wiki.case${c}`)}</div><SimpleMarkdown text={t(`avl:wiki.case${c}Desc`)} /></div>))}
</div></section>
                      <section><h4 className="text-green-400 font-bold text-sm mb-2 uppercase">Complexity</h4><SimpleMarkdown text={t('avl:wiki.compTable')} /></section>
                    </div>
                  )}
                  {activeTab === 'tutorial' && renderTutorial()}
              </div>
          </div>
          {isSidebarOpen && window.innerWidth > 768 && (
              <div 
                onMouseDown={startResizing} 
                className={`absolute right-0 top-0 w-1.5 h-full cursor-col-resize z-[120] hover:bg-blue-500/50 transition-colors ${isResizing ? 'bg-blue-600' : ''}`}
              />
          )}
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-grow flex flex-col min-w-0 h-full relative bg-white">
          <div className={`flex-grow relative bg-slate-50 overflow-hidden ${isResizing ? 'pointer-events-none' : ''}`}>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute bottom-6 left-6 z-30 w-10 h-10 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all">{isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}</button>
                <div className="absolute top-6 left-6 flex gap-3 z-20 pointer-events-none max-w-[calc(100%-80px)]"><div className={`bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 pointer-events-auto ${tourHighlight(0)}`}><button onClick={() => setMode('auto')} className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${mode === 'auto' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:text-slate-600'}`}>AUTO</button><button onClick={() => setMode('manual')} className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${mode === 'manual' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>MANUAL</button></div>{currentStepMsg && (<div className="bg-blue-600/90 backdrop-blur-md px-4 py-2 rounded-2xl text-white shadow-lg border border-blue-400 flex items-center gap-2 animate-in slide-in-from-left-4 overflow-hidden"><div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0"></div><span className="text-[10px] font-black uppercase tracking-wider truncate">{currentStepMsg}</span></div>)}
</div>
                <button onClick={() => setShowHelp(true)} className="absolute top-6 right-6 w-10 h-10 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 shadow-sm z-20"><HelpCircle size={20} /></button>
                
                <TransformWrapper 
                    initialScale={1} 
                    minScale={0.1} 
                    maxScale={2} 
                    limitToBounds={false}
                    centerOnInit={true}
                    panning={{ disabled: isHoveringNode, excluded: ["no-pan"] }}
                >
                    {({ zoomIn, zoomOut, resetTransform }) => (
                        <>
                            <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%", overflow: "visible" }}>
                                <div 
                                  className={`relative cursor-grab active:cursor-grabbing bg-grid-slate-100 ${tourHighlight(2)}`} 
                                  style={{ width: '20000px', height: '20000px' }}
                                  onClick={() => setSelectedNode(null)}
                                >
                                    <div className="absolute left-1/2 top-[100px] -translate-x-1/2" style={{ overflow: 'visible' }}>
                                        <TreeNode node={root} x={0} y={0} level={0} unbalancedIds={unbalancedData.allIds} selectedId={selectedNode?.id} highlightedIds={highlightedIds} pulsingId={pulsingId} onNodeClick={setSelectedNode} onNodeDrag={mode === 'manual' ? handleNodeDrag : undefined} onMouseEnter={() => setIsHoveringNode(true)} onMouseLeave={() => setIsHoveringNode(false)} getBalance={(n) => avlTree.getBalance(n)} 
                                          showHeight={!(activeTab === 'tutorial' && tutorialView === 'lesson' && lessonIndex === 0)}
                                          showBF={!(activeTab === 'tutorial' && tutorialView === 'lesson' && lessonIndex <= 1)}
                                        />
                                    </div>
                                </div>
                            </TransformComponent>
                            <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
                                <button onClick={() => zoomIn()} className="w-10 h-10 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-white transition-all active:scale-90"><Plus size={20} /></button>
                                <button onClick={() => zoomOut()} className="w-10 h-10 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-white transition-all active:scale-90"><Minus size={20} /></button>
                                <button onClick={() => resetTransform()} className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all active:scale-90 mt-2"><LocateFixed size={20} /></button>
                            </div>
                        </>
                    )}
                </TransformWrapper>
          </div>

          {/* BOTTOM BAR - Responsive with Grid Alignment */}
          <div className="min-h-24 bg-white border-t border-slate-200 p-4 flex flex-col md:flex-row gap-6 items-center overflow-visible shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
                <div className={`flex flex-col gap-2 shrink-0 w-full md:w-[320px] ${tourHighlight(3)}`}>
                    <div className="grid grid-cols-[1fr_auto] gap-3 w-full">
                        <div className="flex gap-2 items-center bg-slate-50 p-1 rounded-xl border border-slate-100 flex-grow overflow-hidden">
                            <input type="number" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleInsert()} placeholder="Val" className="flex-grow min-w-0 px-2 py-1.5 bg-transparent outline-none font-bold text-xs text-center text-slate-900" />
                            <button onClick={handleInsert} disabled={isPlaying} className={`px-4 py-1.5 rounded-lg font-black text-white text-[9px] shadow-md shrink-0 ${mode === 'manual' ? 'bg-amber-500' : 'bg-blue-600'}`}>INSERT</button>
                        </div>
                        <button onClick={handleDelete} disabled={isPlaying} className={`px-4 py-2.5 rounded-xl font-black text-white text-[9px] shadow-lg flex items-center gap-2 transition-all shrink-0 ${selectedNode ? 'bg-red-600' : 'bg-slate-300'}`}><Trash2 size={12} /> DELETE</button>
                    </div>
                    <button onClick={handleClear} disabled={isPlaying} className={`w-full flex items-center justify-center gap-2 py-1.5 border border-dashed text-[9px] font-black rounded-lg transition-all uppercase tracking-widest ${resetConfirm ? 'bg-red-600 border-red-600 text-white animate-bounce' : 'border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500'}`}><RefreshCw size={12} className={resetConfirm ? 'animate-spin' : ''} /> {resetConfirm ? 'Confirm Reset?' : 'Reset Playground'}</button>
                </div>
                
                <div className="hidden md:block h-8 w-px bg-slate-100"></div>

                <div className={`flex-grow flex flex-col gap-1 w-full ${tourHighlight(4)}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                            <button onClick={handleUndo} disabled={isPlaying || historyIndex <= 0} className="w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-all"><Undo2 size={16} /></button>
                            <button onClick={handleRedo} disabled={isPlaying || historyIndex >= history.length - 1} className="w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-all"><Redo2 size={16} /></button>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                            <button onClick={() => goToStep(0)} disabled={activeOpSteps.length === 0} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"><SkipBack size={14} /></button>
                            <button onClick={() => goToStep(currentStepIdx - 1)} disabled={activeOpSteps.length <= 0} className="p-1.5 text-slate-600 hover:bg-white rounded-lg shadow-sm transition-all"><ChevronLeft size={18} /></button>
                            <button onClick={togglePause} className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md">{isPlaying && !isPaused ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}</button>
                            <button onClick={() => goToStep(currentStepIdx + 1)} disabled={activeOpSteps.length <= 0} className="p-1.5 text-slate-600 hover:bg-white rounded-lg shadow-sm transition-all"><ChevronRight size={18} /></button>
                            <button onClick={() => goToStep(activeOpSteps.length - 1)} disabled={activeOpSteps.length === 0} className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"><SkipForward size={14} /></button>
                        </div>
                        <div className="relative">
                            <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${showSpeedMenu ? 'bg-blue-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}><Timer size={16} /></button>
                            {showSpeedMenu && (
                                <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-2xl border border-slate-100 p-1 flex flex-col gap-0.5 z-50 animate-in slide-in-from-bottom-2">
                                    {[0.25, 0.5, 1, 1.5, 2, 3].map(speed => (<button key={speed} onClick={() => { setPlaybackSpeed(speed); setShowSpeedMenu(false); }} className={`px-4 py-2 rounded-xl text-[9px] font-black ${playbackSpeed === speed ? 'bg-blue-600 text-white' : 'hover:bg-slate-50 text-slate-500'}`}>{speed}x</button>))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[7px] font-black text-slate-400 w-8 text-center">STEP {Math.max(0, currentStepIdx + 1)}</span>
                        <input type="range" min="0" max={Math.max(0, activeOpSteps.length - 1)} value={Math.max(0, currentStepIdx)} onChange={(e) => goToStep(parseInt(e.target.value))} className="flex-grow h-1 bg-slate-100 rounded-full accent-blue-600 cursor-pointer" />
                        <span className="text-[7px] font-black text-slate-400 w-8 text-right">{activeOpSteps.length}</span>
                    </div>
                </div>

                <div className="hidden md:block h-8 w-px bg-slate-100"></div>

                {/* STATS */}
                <div className="hidden sm:flex w-[150px] flex-col gap-1 shrink-0 text-sm">
                    <div className="flex justify-between items-center p-2 bg-blue-50/50 rounded-lg border border-blue-100"><span className="text-[7px] font-black text-blue-400 uppercase tracking-widest">Height</span><span className="text-xs font-black text-blue-700 font-mono">{root ? root.height : 0}</span></div>
                    <div className={`flex justify-between items-center p-2 rounded-lg border ${unbalancedData.allIds.length > 0 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'}`}><span className="text-[7px] font-black uppercase tracking-widest">Status</span><span className="text-[8px] font-black uppercase font-mono">{unbalancedData.allIds.length > 0 ? 'Error' : 'Stable'}</span></div>
                </div>
          </div>
      </div>

      {showHelp && (<div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in"><div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden relative animate-in zoom-in-95 duration-200">
          <X onClick={() => setShowHelp(false)} className="absolute top-6 right-6 cursor-pointer text-slate-400 hover:text-slate-600 transition-colors z-10" />
          
          <div className="bg-blue-600 p-6 text-white">
              <h3 className="text-2xl font-bold flex items-center gap-2"><HelpCircle /> {t('avl:guide.helpTitle')}</h3>
              
              <div className="flex gap-2 mt-4">
                  <button onClick={() => setHelpTab('concept')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${helpTab === 'concept' ? 'bg-white text-blue-600' : 'bg-blue-700 text-blue-200 hover:bg-blue-500'}`}>Operation</button>
                  <button onClick={() => setHelpTab('ui')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${helpTab === 'ui' ? 'bg-white text-blue-600' : 'bg-blue-700 text-blue-200 hover:bg-blue-500'}`}>Interface</button>
              </div>
          </div>

          <div className="p-8 space-y-6">
              {helpTab === 'concept' ? (
                  <>
                      <p className="text-slate-600 font-medium text-sm leading-relaxed">{t('avl:guide.helpDesc')}</p>
                      <div className="grid grid-cols-1 gap-4">
                          <div className="group flex gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-100 transition-colors hover:bg-blue-100"><div className="bg-white p-3 rounded-xl shadow-sm h-fit"><Undo2 className="text-blue-600 rotate-180" /></div><div><h4 className="font-bold text-blue-900 text-sm">{t('avl:guide.helpRight')}</h4><SimpleMarkdown text={t('avl:guide.helpRightDesc')} className="text-blue-700" /></div></div>
                          <div className="group flex gap-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 transition-colors hover:bg-indigo-100"><div className="bg-white p-3 rounded-xl shadow-sm h-fit"><Undo2 className="text-indigo-600" /></div><div><h4 className="font-bold text-indigo-900 text-sm">{t('avl:guide.helpLeft')}</h4><SimpleMarkdown text={t('avl:guide.helpLeftDesc')} className="text-sm text-indigo-700" /></div></div>
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
                          <h4 className="font-bold text-slate-900 text-lg">{t('avl:guide.ui.start')}</h4>
                          <p className="text-sm text-slate-500 max-w-xs mx-auto">{t('avl:guide.ui.startDesc')}</p>
                      </div>
                      <button onClick={() => { setShowHelp(false); setTourStep(0); }} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-widest flex items-center gap-2">
                          {t('avl:guide.ui.startBtn')} <ChevronRight size={14} />
                      </button>
                  </div>
              )}
          </div>
      </div></div>)}
      {renderTourTooltip()}
      {renderCongrats()}
    </div>
  );
};
