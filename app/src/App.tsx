import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  detectBrowserLang,
  isUrlLang,
  urlLangToI18n,
  type UrlLang,
} from './lib/locale';

// Lazy load pages with named exports
const HomePage = lazy(() => import('./pages/Home').then(module => ({ default: module.HomePage })));
const AVLTreePage = lazy(() => import('./pages/AVLTree').then(m => ({ default: m.AVLTreePage })));
const BloomFilterPage = lazy(() => import('./pages/BloomFilter').then(m => ({ default: m.BloomFilterPage })));
const FibonacciHeapPage = lazy(() => import('./pages/FibonacciHeap').then(m => ({ default: m.FibonacciHeapPage })));
const MinMaxHeapPage = lazy(() => import('./pages/MinMaxHeap').then(m => ({ default: m.MinMaxHeapPage })));
const DeapPage = lazy(() => import('./pages/DeapPage').then(m => ({ default: m.DeapPage })));
const SmmhPage = lazy(() => import('./pages/SmmhPage').then(m => ({ default: m.SmmhPage })));
const BTreePage = lazy(() => import('./pages/BTreePage').then(m => ({ default: m.BTreePage })));
const BPlusTreePage = lazy(() => import('./pages/BPlusTreePage').then(m => ({ default: m.BPlusTreePage })));
const RedBlackTreePage = lazy(() => import('./pages/RedBlackTreePage').then(m => ({ default: m.RedBlackTreePage })));

const Loading = () => (
  <div className="flex items-center justify-center h-full w-full bg-slate-50 text-slate-400 font-mono text-sm animate-pulse">
    Loading...
  </div>
);

const RootRedirect = () => {
  const lang = detectBrowserLang();
  return <Navigate to={`/${lang}`} replace />;
};

const LangGate = ({ children }: { children: ReactNode }) => {
  const { lang } = useParams<{ lang: string }>();
  const location = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (isUrlLang(lang)) {
      const target = urlLangToI18n(lang);
      if (i18n.language !== target) {
        i18n.changeLanguage(target);
      }
    }
  }, [lang, i18n]);

  if (!isUrlLang(lang)) {
    const fallback = detectBrowserLang();
    return <Navigate to={`/${fallback}${location.pathname}`} replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route
          path="/:lang"
          element={
            <LangGate>
              <MainLayout />
            </LangGate>
          }
        >
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
          <Route path="deap" element={
            <Suspense fallback={<Loading />}>
              <DeapPage />
            </Suspense>
          } />
          <Route path="smmh" element={
            <Suspense fallback={<Loading />}>
              <SmmhPage />
            </Suspense>
          } />
          <Route path="b-tree" element={
            <Suspense fallback={<Loading />}>
              <BTreePage />
            </Suspense>
          } />
          <Route path="b-plus-tree" element={
            <Suspense fallback={<Loading />}>
              <BPlusTreePage />
            </Suspense>
          } />
          <Route path="red-black-tree" element={
            <Suspense fallback={<Loading />}>
              <RedBlackTreePage />
            </Suspense>
          } />
          <Route path="*" element={<Navigate to="" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export type AppLang = UrlLang;
export default App;
