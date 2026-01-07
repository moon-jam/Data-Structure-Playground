import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Suspense, lazy } from 'react';

// Lazy load pages with named exports
const HomePage = lazy(() => import('./pages/Home').then(module => ({ default: module.HomePage })));
const AVLTreePage = lazy(() => import('./pages/AVLTree').then(m => ({ default: m.AVLTreePage })));
const BloomFilterPage = lazy(() => import('./pages/BloomFilter').then(m => ({ default: m.BloomFilterPage })));
const FibonacciHeapPage = lazy(() => import('./pages/FibonacciHeap').then(m => ({ default: m.FibonacciHeapPage })));
const MinMaxHeapPage = lazy(() => import('./pages/MinMaxHeap').then(m => ({ default: m.MinMaxHeapPage })));

const Loading = () => (
  <div className="flex items-center justify-center h-full w-full bg-slate-50 text-slate-400 font-mono text-sm animate-pulse">
    Loading...
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={
            <Suspense fallback={<Loading />}>
              <HomePage />
            </Suspense>
          } />
          <Route path="avl-tree" element={
            <Suspense fallback={<Loading />}>
              <AVLTreePage />
            </Suspense>
          } />
          <Route path="bloom-filter" element={
            <Suspense fallback={<Loading />}>
              <BloomFilterPage />
            </Suspense>
          } />
          <Route path="fibonacci-heap" element={
            <Suspense fallback={<Loading />}>
              <FibonacciHeapPage />
            </Suspense>
          } />
          <Route path="min-max-heap" element={
            <Suspense fallback={<Loading />}>
              <MinMaxHeapPage />
            </Suspense>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;