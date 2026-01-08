import React, { useState, useEffect, useRef } from 'react';
import { FibonacciHeap } from '../structures/fibonacci-heap/FibonacciHeap';
import type { FibHeapSnapshot } from '../structures/fibonacci-heap/FibonacciHeap';
import { FibNode } from '../components/fibonacci-heap/FibNode';
import { calculateLayout } from '../components/fibonacci-heap/layout';
import type { VisualizationStep } from '../structures/common/types';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { SimpleMarkdown } from '../components/playground/SimpleMarkdown';
import { ControlIsland } from '../components/playground/ControlIsland';
import { PlaybackControls } from '../components/playground/PlaybackControls';
import { 
  Plus, Minus, LocateFixed, PanelLeftClose, PanelLeft, 
  RefreshCw, Trash2, ArrowDownToLine, BookOpen, ScrollText, 
  GraduationCap
} from 'lucide-react';

const DegreeTable: React.FC<{ table: (number | null)[] | undefined }> = ({ table }) => {
  const displayTable = table || new Array(15).fill(null);
  const maxIdx = Math.max(displayTable.length, 10);
  
  return (
    <div className="absolute top-6 right-6 z-20 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-slate-200 pointer-events-none transition-all duration-300 min-w-[200px]">
      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Degree Table</h4>
        <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-[9px] font-bold text-slate-400">Consolidating</span>
        </div>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-2 custom-scrollbar no-pan">
        {Array.from({ length: maxIdx }).map((_, idx) => {
          const val = displayTable[idx];
          const isActive = val !== undefined && val !== null;
          return (
            <div key={idx} className="flex flex-col items-center gap-1 shrink-0 group">
               <div className={`w-8 h-10 flex items-center justify-center rounded-lg border-2 text-[11px] font-black transition-all duration-300 ${isActive ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-100' : 'bg-slate-50 border-slate-100 text-slate-300 scale-95 group-hover:border-slate-300'}`}>
                 {isActive ? val : ''}
               </div>
               <span className={`text-[8px] font-mono font-bold transition-colors ${isActive ? 'text-blue-600' : 'text-slate-300'}`}>{idx}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const FibonacciHeapPage: React.FC = () => {
  const { t } = useTranslation(['common', 'fib'], { useSuspense: false });
  const [heap] = useState(() => new FibonacciHeap());
  const [snapshot, setSnapshot] = useState<FibHeapSnapshot>({ roots: [], minNodeId: null, nodeCount: 0 });
  
  // Playback State
  const [history, setHistory] = useState<{id: string, action: string, steps: VisualizationStep[], finalSnapshot: FibHeapSnapshot}[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [activeSteps, setActiveSteps] = useState<VisualizationStep[]>([]);
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [currentMsg, setCurrentStepMsg] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<{id: string, val: number} | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  // Input State
  const [inputValue, setInputValue] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [activeTab, setActiveTab] = useState<'logs' | 'wiki' | 'tutorial'>('logs');
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

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
      if (resetConfirm) { 
          const timer = setTimeout(() => setResetConfirm(false), 3000); 
          return () => clearTimeout(timer); 
      } 
  }, [resetConfirm]);

  useEffect(() => {
    if (historyIndex === -1) {
      setHistory([{ id: 'init', action: 'Initial', steps: [], finalSnapshot: { roots: [], minNodeId: null, nodeCount: 0 } }]);
      setHistoryIndex(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Playback Engine ---
  const startOperation = (action: string, steps: VisualizationStep[]) => {
      stopPlayback();
      setActiveSteps(steps);
      setCurrentStepIdx(0);
      const finalSnapshot = steps.length > 0 && steps[steps.length - 1].payload?.snapshot 
          ? steps[steps.length - 1].payload.snapshot 
          : heap.getSnapshot();
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

  const handleUndo = () => {
      if (historyIndex <= 0 || isPlaying) return;
      stopPlayback();
      const targetIdx = historyIndex - 1;
      const entry = history[targetIdx];
      heap.fromSnapshot(entry.finalSnapshot);
      setSnapshot(entry.finalSnapshot);
      setActiveSteps(entry.steps);
      setCurrentStepIdx(entry.steps.length > 0 ? entry.steps.length - 1 : -1);
      setHistoryIndex(targetIdx);
  };

  const handleRedo = () => {
      if (historyIndex >= history.length - 1 || isPlaying) return;
      stopPlayback();
      const targetIdx = historyIndex + 1;
      const entry = history[targetIdx];
      setActiveSteps(entry.steps);
      setCurrentStepIdx(0);
      setHistoryIndex(targetIdx);
      if (entry.steps.length > 0) startPlayback(entry.steps.length);
      else {
          heap.fromSnapshot(entry.finalSnapshot);
          setSnapshot(entry.finalSnapshot);
      }
  };

  // Sync View with Step
  useEffect(() => {
      if (activeSteps.length > 0 && currentStepIdx >= 0) {
          const step = activeSteps[currentStepIdx];
          if (step.payload?.snapshot) {
              setSnapshot(step.payload.snapshot);
          }
          setHighlightedIds(step.targetIds || []);
          setCurrentStepMsg(step.message || null);
      }
  }, [currentStepIdx, activeSteps]);

  // --- Handlers ---
  const handleInsert = () => {
      const val = parseInt(inputValue);
      if (!isNaN(val)) {
          startOperation(`Insert ${val}`, heap.insert(val));
          setInputValue('');
      }
  };

  const handleExtractMin = () => {
      if (snapshot.nodeCount > 0) {
          startOperation('Extract Min', heap.extractMin());
      }
  };

  const handleClear = () => {
      if (!resetConfirm) { setResetConfirm(true); return; }
      setResetConfirm(false);
      if (isPlaying) stopPlayback();
      heap.minNode = null;
      heap.nodeCount = 0;
      const emptySnapshot = { roots: [], minNodeId: null, nodeCount: 0 };
      setSnapshot(emptySnapshot);
      setHistory([{ id: 'init', action: 'Cleared', steps: [], finalSnapshot: emptySnapshot }]);
      setHistoryIndex(0);
      setActiveSteps([]);
      setCurrentStepIdx(-1);
      setHighlightedIds([]);
      setCurrentStepMsg(null);
      setSelectedNode(null);
  };

  const handleNodeClick = (id: string, val: number) => {
      if (selectedNode?.id === id) {
          setSelectedNode(null);
          setInputValue('');
      } else {
          setSelectedNode({ id, val });
          setInputValue(val.toString());
      }
  };

  const handleDecreaseKey = () => {
      if (!selectedNode) return;
      const newVal = parseInt(inputValue);
      if (!isNaN(newVal)) {
          if (newVal >= selectedNode.val) {
              alert("New key must be smaller than current key.");
              return;
          }
          startOperation(`Decrease Key ${selectedNode.val} -> ${newVal}`, heap.decreaseKey(selectedNode.id, newVal));
          setSelectedNode(null);
          setInputValue('');
      }
  };

  const handleDelete = () => {
      if (!selectedNode) return;
      startOperation(`Delete ${selectedNode.val}`, heap.delete(selectedNode.id));
      setSelectedNode(null);
      setInputValue('');
  };

  return (
    <div className={`h-full w-full flex bg-slate-100 overflow-hidden relative font-sans text-slate-900 ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      {/* FORCE DISABLE TRANSITION DURING RESIZE */}
      <style>{isResizing ? `* { transition: none !important; cursor: col-resize !important; user-select: none !important; }` : ''}</style>

      {/* SIDEBAR */}
      <div 
        style={{ 
            width: isSidebarOpen ? (window.innerWidth > 768 ? `${sidebarWidth}px` : '100%') : '0px',
            transition: isResizing ? 'none' : 'width 300ms ease-in-out'
        }}
        className={`h-full flex flex-col bg-slate-900 border-r border-slate-800 shrink-0 z-[100] shadow-2xl relative ${!isSidebarOpen ? 'overflow-hidden' : ''} ${window.innerWidth <= 768 ? 'fixed left-0 top-0' : 'relative'}`}
      >
          {window.innerWidth <= 768 && isSidebarOpen && <button onClick={() => setIsSidebarOpen(false)} className="absolute top-4 right-4 text-white z-[110]"><PanelLeftClose size={24} /></button>}
          <div className="flex flex-col h-full w-full">
              <div className="flex p-2 gap-1 bg-slate-950/50">
                  <button onClick={() => setActiveTab('logs')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-[9px] sm:text-[10px] font-black uppercase transition-all ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><ScrollText size={14} /><span className="hidden sm:inline">Logs</span></button>
                  <button onClick={() => setActiveTab('wiki')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-[9px] sm:text-[10px] font-black uppercase transition-all ${activeTab === 'wiki' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><BookOpen size={14} /><span className="hidden sm:inline">Wiki</span></button>
                  <button onClick={() => setActiveTab('tutorial')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-[9px] sm:text-[10px] font-black uppercase transition-all ${activeTab === 'tutorial' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><GraduationCap size={14} /><span className="hidden sm:inline">Course</span></button>
              </div>
              <div className="flex-grow overflow-y-auto p-4 font-mono text-[10px] text-slate-300 custom-scrollbar">
                  {activeTab === 'logs' && (
                    <div className="space-y-2">
                      <h3 className="text-slate-500 font-black uppercase tracking-[0.2em] mb-4">History</h3>
                      {history.slice(1).reverse().map((e, i) => (
                        <button 
                          key={e.id} 
                          onClick={() => { 
                            stopPlayback(); 
                            const targetIdx = history.length - 1 - i;
                            heap.fromSnapshot(e.finalSnapshot);
                            setSnapshot(e.finalSnapshot);
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
                          <div className="text-[9px] opacity-60 truncate">{e.steps[e.steps.length-1]?.message}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {activeTab === 'wiki' && (
                    <div className="space-y-8 font-sans pb-12 text-slate-400">
                      <h3 className="text-white font-black text-xs uppercase tracking-[0.3em]">Knowledge Base</h3>
                      <section><h4 className="text-blue-400 font-bold text-sm mb-2 uppercase">{t('fib:wiki.concept')}</h4><SimpleMarkdown text={t('fib:wiki.conceptDesc')} /></section>
                      <section><h4 className="text-green-400 font-bold text-sm mb-2 uppercase">{t('fib:wiki.performance')}</h4><SimpleMarkdown text={t('fib:wiki.perfTable')} /></section>
                      <section><h4 className="text-amber-400 font-bold text-sm mb-2 uppercase">{t('fib:wiki.lazyStrategy')}</h4><SimpleMarkdown text={t('fib:wiki.lazyStrategyDesc')} /></section>
                      <section><h4 className="text-red-400 font-bold text-sm mb-2 uppercase">{t('fib:wiki.cascadingCut')}</h4><SimpleMarkdown text={t('fib:wiki.cascadingCutDesc')} /></section>
                    </div>
                  )}
                  {activeTab === 'tutorial' && <div className="text-center opacity-50 mt-10">Interactive course coming soon.</div>}
              </div>
          </div>
          {isSidebarOpen && window.innerWidth > 768 && (
              <div 
                onMouseDown={startResizing} 
                className={`absolute right-0 top-0 w-1.5 h-full cursor-col-resize z-[120] hover:bg-blue-500/50 transition-colors ${isResizing ? 'bg-blue-600' : ''}`}
              />
          )}
      </div>

      <div className="flex-grow flex flex-col min-w-0 h-full relative bg-white">
        {/* Canvas */}
        <div className={`flex-grow relative overflow-hidden bg-grid-slate-100 ${isResizing ? 'pointer-events-none' : ''}`}>
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute bottom-6 left-6 z-30 w-10 h-10 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all">{isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}</button>
             
             <div className="absolute top-6 left-6 z-20 pointer-events-none">
                {currentMsg && (
                    <div className="bg-blue-600/90 backdrop-blur-md px-4 py-2 rounded-2xl text-white shadow-lg border border-blue-400 flex items-center gap-2 animate-in slide-in-from-left-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0"></div>
                        <span className="text-xs font-black uppercase tracking-wider">{currentMsg}</span>
                    </div>
                )}
             </div>

             <DegreeTable table={snapshot.degreeTable} />

             <TransformWrapper initialScale={1} minScale={0.1} maxScale={2} centerOnInit>
                {({ zoomIn, zoomOut, resetTransform }) => {
                    const layoutRoots = calculateLayout(snapshot.roots);
                    return (
                    <>
                        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
                            <div className="w-[10000px] h-[10000px] relative cursor-grab active:cursor-grabbing">
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ overflow: 'visible' }}>
                                    {layoutRoots.map((root, idx) => {
                                        const nextRoot = layoutRoots[idx + 1];
                                        return (
                                        <React.Fragment key={root.id}>
                                            {nextRoot && (
                                                <svg className="absolute top-0 left-0 w-px h-px overflow-visible pointer-events-none z-10">
                                                    <motion.line
                                                        animate={{
                                                            x1: root.x + 25,
                                                            y1: root.y,
                                                            x2: nextRoot.x - 25,
                                                            y2: nextRoot.y
                                                        }}
                                                        stroke="#94a3b8"
                                                        strokeWidth="2"
                                                        strokeDasharray="4 4"
                                                    />
                                                </svg>
                                            )}
                                            <FibNode 
                                                node={root} 
                                                highlightedIds={highlightedIds}
                                                selectedId={selectedNode?.id}
                                                onNodeClick={handleNodeClick}
                                            />
                                        </React.Fragment>
                                    )})}
                                </div>
                            </div>
                        </TransformComponent>
                        
                        <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
                            <button onClick={() => zoomIn()} className="w-10 h-10 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-white active:scale-90"><Plus size={20} /></button>
                            <button onClick={() => zoomOut()} className="w-10 h-10 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-white active:scale-90"><Minus size={20} /></button>
                            <button onClick={() => resetTransform()} className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 mt-2"><LocateFixed size={20} /></button>
                        </div>
                    </>
                    );
                }}
             </TransformWrapper>
        </div>

        {/* Bottom Bar */}
        <div className="bg-white border-t border-slate-200 p-3 sm:p-4 flex flex-col lg:flex-row gap-4 lg:gap-4 items-stretch overflow-visible shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-[100]">
            <ControlIsland label="Operations" className="w-full lg:w-[320px]">
                <div className="grid grid-cols-[1fr_auto] gap-2 w-full">
                    {!selectedNode ? (
                        <>
                            <div className="flex gap-2 items-center bg-white p-1 rounded-xl border border-slate-200 flex-grow overflow-hidden shadow-sm">
                                <input value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleInsert()} className="flex-grow min-w-0 px-2 text-xs font-bold outline-none text-center" placeholder="Val" />
                                <button onClick={handleInsert} disabled={isPlaying} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-black shadow-md shrink-0 active:scale-95 transition-all">INSERT</button>
                            </div>
                            <button onClick={handleExtractMin} disabled={isPlaying} className="px-4 py-2.5 bg-amber-500 text-white rounded-xl text-[11px] font-black shadow-lg flex items-center gap-2 active:scale-95 transition-all shrink-0">
                                <ArrowDownToLine size={14} /> EXTRACT MIN
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="flex gap-2 items-center bg-white p-1 rounded-xl border border-slate-200 flex-grow overflow-hidden shadow-sm">
                                <input value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleDecreaseKey()} className="flex-grow min-w-0 px-2 text-xs font-bold outline-none text-center" placeholder="New Val" />
                                <button onClick={handleDecreaseKey} disabled={isPlaying} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[11px] font-black shadow-md shrink-0 active:scale-95 transition-all">DECREASE</button>
                            </div>
                            <button onClick={handleDelete} disabled={isPlaying} className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-[11px] font-black shadow-lg flex items-center gap-2 active:scale-95 transition-all shrink-0">
                                <Trash2 size={14} /> DELETE
                            </button>
                        </>
                    )}
                </div>
                {!selectedNode && (
                    <div className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest bg-slate-100/50 rounded-lg py-1 border border-slate-100">
                        Select a node for more actions
                    </div>
                )}
                <button onClick={handleClear} disabled={isPlaying} className={`w-full flex items-center justify-center gap-2 py-1.5 border border-dashed text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${resetConfirm ? 'bg-red-600 border-red-600 text-white animate-bounce' : 'border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500'}`}><RefreshCw size={12} className={resetConfirm ? 'animate-spin' : ''} /> {resetConfirm ? 'Confirm Reset?' : 'Reset Playground'}</button>
            </ControlIsland>

            <ControlIsland label="Timeline" className="flex-grow" metadata={`Step ${Math.max(0, currentStepIdx + 1)} / ${activeSteps.length}`}>
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

            <ControlIsland label="Info" className="w-full lg:w-[160px] shrink-0">
                <div className="flex justify-between items-center p-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nodes</span>
                    <span className="text-sm font-black text-blue-700">{snapshot.nodeCount}</span>
                </div>
            </ControlIsland>
        </div>
      </div>
    </div>
  );
};
