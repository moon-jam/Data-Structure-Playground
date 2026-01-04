import React from 'react';
import { Link } from 'react-router-dom';
import { structures } from '../data/structures';
import { ArrowRight, Construction, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const [completedMap, setCompletedStatus] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    // Check completion status for all structures
    const status: Record<string, boolean> = {};
    structures.forEach(s => {
      status[s.id] = localStorage.getItem(`ds-playground-${s.id}-completed`) === 'true';
    });
    setCompletedStatus(status);
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-4 py-12">
        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">
          {t('home.title')}
          <span className="block text-blue-600 mt-2">{t('home.subtitle')}</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          {t('home.description')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {structures.map((struct) => {
          const isCompleted = completedMap[struct.id];
          return (
            <Link 
              key={struct.id} 
              to={struct.implemented ? struct.path : '#'}
              className={`
                group relative overflow-hidden rounded-2xl border transition-all duration-300
                ${struct.implemented 
                  ? 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer' 
                  : 'bg-slate-50 border-slate-100 opacity-75 cursor-not-allowed'}
              `}
            >
              <div className="p-6 h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className={`text-xl font-bold ${struct.implemented ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-50'}`}>
                    {struct.name}
                  </h3>
                  {isCompleted ? (
                    <div className="flex items-center gap-1.5 bg-green-500 text-white px-2 py-1 rounded-lg text-[10px] font-black uppercase shadow-lg shadow-green-200 animate-in zoom-in">
                        <CheckCircle2 size={12} /> Done
                    </div>
                  ) : struct.implemented ? (
                    <CheckCircle2 className="text-slate-200" size={20} />
                  ) : (
                    <Construction className="text-slate-400" size={20} />
                  )}
                </div>
                
                <p className="text-slate-600 mb-6 flex-grow">
                  {struct.description}
                </p>
                
                <div className="flex items-center text-sm font-medium">
                  {struct.implemented ? (
                    <span className="text-blue-600 flex items-center group-hover:underline">
                      {isCompleted ? 'Review Course' : t('home.startLearning')} <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
                    </span>
                  ) : (
                    <span className="text-slate-400 uppercase tracking-wider text-xs font-bold">
                      {t('home.comingSoon')}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Decoration */}
              <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-150 ${isCompleted ? 'bg-green-600' : struct.implemented ? 'bg-blue-600' : 'bg-slate-400'}`} />
            </Link>
          );
        })}
      </div>
    </div>
  );
};
