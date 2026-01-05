import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, Github, Languages, ChevronRight, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isHome = location.pathname === '/';
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Playground detection
  const isPlayground = location.pathname !== '/'; 

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsLangMenuOpen(false);
  };

  return (
    <div className={`flex flex-col font-sans text-slate-900 bg-white ${isPlayground ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {/* --- Full Width Professional Header --- */}
      <header className="bg-slate-900 text-white shadow-md z-50 shrink-0 border-b border-white/5">
        <div className="w-full px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20">
                <Home size={18} className="text-white" />
              </div>
              <span className="font-black text-base tracking-tight uppercase">{t('appTitle')}</span>
            </Link>
            
            {!isHome && (
              <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-left-2">
                <ChevronRight size={14} className="text-slate-600" />
                <span className="text-blue-400 font-bold text-xs uppercase tracking-widest bg-blue-400/10 px-2 py-1 rounded">
                  {location.pathname.substring(1).replace(/-/g, ' ')}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center">
             {/* Desktop Navigation */}
             <div className="hidden sm:flex items-center space-x-6">
                <div className="relative">
                    <button 
                      onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                      className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest"
                    >
                      <Languages size={16} />
                      <span>{i18n.language === 'zh-TW' ? '繁體中文' : 'English'}</span>
                    </button>
                    
                    {isLangMenuOpen && (
                      <div className="absolute right-0 mt-3 w-40 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 text-slate-900 z-50 animate-in fade-in zoom-in-95">
                        <button onClick={() => changeLanguage('zh-TW')} className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-slate-50 ${i18n.language === 'zh-TW' ? 'text-blue-600' : 'text-slate-600'}`}>繁體中文</button>
                        <button onClick={() => changeLanguage('en')} className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-slate-50 ${i18n.language === 'en' ? 'text-blue-600' : 'text-slate-600'}`}>English</button>
                      </div>
                    )}
                </div>

                <div className="h-4 w-px bg-slate-800"></div>

                <a 
                    href="https://github.com/moon-jam/Data-Structure-Playground" 
                    target="_blank" rel="noopener noreferrer"
                    className="text-slate-400 hover:text-white transition-colors"
                >
                    <Github size={20} />
                </a>
             </div>

             {/* Mobile Menu Button */}
             <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="sm:hidden p-2 text-slate-400 hover:text-white transition-colors"
             >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
             </button>

             {/* Mobile Dropdown */}
             {isMenuOpen && (
                <div className="absolute top-14 left-0 w-full bg-slate-900 border-b border-white/5 shadow-2xl p-6 sm:hidden flex flex-col gap-6 animate-in slide-in-from-top-2 z-[60]">
                   <div className="flex flex-col gap-4">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Language</span>
                      <div className="grid grid-cols-2 gap-2">
                         <button onClick={() => { changeLanguage('zh-TW'); setIsMenuOpen(false); }} className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${i18n.language === 'zh-TW' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>繁體中文</button>
                         <button onClick={() => { changeLanguage('en'); setIsMenuOpen(false); }} className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${i18n.language === 'en' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>English</button>
                      </div>
                   </div>
                   <div className="h-px bg-white/5 w-full"></div>
                   <a 
                      href="https://github.com/moon-jam/Data-Structure-Playground" 
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between group"
                   >
                      <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">GitHub Repository</span>
                      <Github size={20} className="text-slate-400 group-hover:text-white" />
                   </a>
                </div>
             )}
          </div>
        </div>
      </header>

      {/* --- Main Area --- */}
      <main className={`flex-grow flex flex-col relative ${isPlayground ? 'overflow-hidden' : 'container mx-auto px-4 py-12'}`}>
        <Outlet />
      </main>

      {/* Footer only on home */}
      {isHome && (
        <footer className="bg-slate-50 border-t border-slate-200 py-8 shrink-0 text-center text-slate-400 text-xs font-medium uppercase tracking-widest">
          {t('footer', { year: new Date().getFullYear() })}
        </footer>
      )}
    </div>
  );
};
