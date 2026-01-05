import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/Home';
import { AVLTreePage } from './pages/AVLTree';
import { BloomFilterPage } from './pages/BloomFilter';
import { MainLayout } from './layouts/MainLayout';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="avl-tree" element={<AVLTreePage />} />
          <Route path="bloom-filter" element={<BloomFilterPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
