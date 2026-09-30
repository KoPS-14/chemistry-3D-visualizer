import React from 'react';
import type { ElementData } from '../types/reaction';
import { ElementInfoPanel } from './ElementInfoPanel';
import { ContextualAI } from './ContextualAI';

interface ElementPanelProps {
  element: ElementData | null;
  aiExplanation: string | null;
  isLoadingAI?: boolean;
  onSelectFollowUp?: (question: string) => void;
}

export const ElementPanel: React.FC<ElementPanelProps> = ({
  element,
  aiExplanation,
  isLoadingAI = false,
  onSelectFollowUp,
}) => {
  if (!element) return null;

  const followUps = [
    `What common compounds contain ${element.name}?`,
    `How does the electron configuration of ${element.name} influence its chemical reactivity?`,
    `Explain the periodic trends (radius, electronegativity) of ${element.name}.`,
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Element Technical Properties Card */}
      <ElementInfoPanel element={element} />

      {/* AI Educational Explanation & Follow-ups */}
      <ContextualAI
        title={`AI Chemical Analysis: ${element.name} (${element.symbol})`}
        explanation={aiExplanation}
        isLoading={isLoadingAI}
        followUpQuestions={followUps}
        onSelectFollowUp={onSelectFollowUp}
      />
    </div>
  );
};
