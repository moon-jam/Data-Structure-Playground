import React from 'react';
import { Link } from 'react-router-dom';
import { structures } from '../data/structures';
import { ArrowRight, Construction, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const [completedMap, setCompletedStatus] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const status: Record<string, boolean> = {};
    structures.forEach(s => {
      status[s.id] = localStorage.getItem(`ds-playground-${s.id}-completed`) === 'true';
    });
    setCompletedStatus(status);
  }, []);

  return (
    <div className="relative min-h-screen bg-white font-sans">
      {/* Subtle Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-30" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 md:py-28">
        <div className="space-y-4 mb-20">
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight">
            {t('home.title')}
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-blue-600 tracking-tight">
            {t('home.subtitle')}
          </h2>
          <p className="text-slate-500 max-w-2xl text-lg font-medium leading-relaxed">
            {t('home.description')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {structures.map((struct) => {
            const isCompleted = completedMap[struct.id];
            return (
              <Link 
                key={struct.id} 
                to={struct.implemented ? struct.path : '#'}
                className={`
                  group relative overflow-hidden rounded-3xl border transition-all duration-300
                  ${struct.implemented 
                    ? 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-xl cursor-pointer' 
                    : 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'}
                `}
              >
                <div className="p-8 h-full flex flex-col relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`
                        w-12 h-12 rounded-2xl flex items-center justify-center transition-all
                        ${struct.implemented ? 'bg-slate-900 text-white group-hover:bg-blue-600' : 'bg-slate-200 text-slate-400'}
                    `}>
                        {isCompleted ? <CheckCircle2 size={24} /> : struct.implemented ? <span className="font-black text-lg">{struct.name[0]}</span> : <Construction size={20} />}
                    </div>
                    {isCompleted && (
                        <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg">Done</span>
                    )}
                  </div>
                  
                  <h3 className={`text-xl font-black mb-2 tracking-tight ${struct.implemented ? 'text-slate-900' : 'text-slate-400'}`}>
                    {t(`home.structures.${struct.id}.name`, { defaultValue: struct.name })}
                  </h3>
                  
                  <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-grow font-medium">
                    {t(`home.structures.${struct.id}.description`, { defaultValue: struct.description })}
                  </p>
                  
                  <div className={`flex items-center text-xs font-black uppercase tracking-widest ${struct.implemented ? 'text-blue-600' : 'text-slate-300'}`}>
                    {struct.implemented ? (
                      <span className="flex items-center gap-2">
                        {isCompleted ? 'Review' : t('home.startLearning')} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    ) : t('home.comingSoon')}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};
