import React from 'react';
import { X, BookOpen, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PrerequisiteBannerProps {
  structureId: string;
  onDismiss: () => void;
}

/**
 * A dismissible banner shown to first-time users explaining prerequisite knowledge.
 * For AVL Tree, this explains that it's based on Binary Search Tree (BST).
 */
export const PrerequisiteBanner: React.FC<PrerequisiteBannerProps> = ({ structureId, onDismiss }) => {
  const { t } = useTranslation(['common', structureId]);

  return (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4 mb-4 shadow-sm animate-in slide-in-from-top-2 relative">
      <button 
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 text-amber-400 hover:text-amber-600 transition-colors rounded-lg hover:bg-amber-100"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
      
      <div className="flex items-start gap-3 pr-8">
        <div className="bg-amber-100 p-2 rounded-xl shrink-0">
          <BookOpen size={20} className="text-amber-600" />
        </div>
        
        <div className="space-y-2">
          <h4 className="font-bold text-amber-900 text-sm">
            {t(`${structureId}:prerequisite.title`, { defaultValue: 'Before You Start' })}
          </h4>
          <p className="text-amber-800 text-xs leading-relaxed">
            {t(`${structureId}:prerequisite.description`, { 
              defaultValue: 'This structure builds on fundamental concepts. Make sure you understand the basics first!' 
            })}
          </p>
          
          <div className="flex flex-wrap gap-2 pt-1">
            <a 
              href="https://visualgo.net/en/bst" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-lg transition-colors uppercase tracking-wider"
            >
              <ExternalLink size={10} />
              {t(`${structureId}:prerequisite.learnBST`, { defaultValue: 'Learn BST' })}
            </a>
            <button 
              onClick={onDismiss}
              className="text-[10px] font-bold text-amber-600 hover:text-amber-800 px-2 py-1 uppercase tracking-wider"
            >
              {t(`${structureId}:prerequisite.gotIt`, { defaultValue: 'Got it!' })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
