import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './pages/Home';
import { AVLTreePage } from './pages/AVLTree';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="avl-tree" element={<AVLTreePage />} />
          {/* Add other routes here as they are implemented */}
          <Route path="*" element={<div className="p-12 text-center text-slate-500">Page not found</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;