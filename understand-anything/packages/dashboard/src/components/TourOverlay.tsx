import React from 'react';
import { useGraphStore, selectCurrentTourStep } from '../store';
import clsx from 'clsx';

export const TourOverlay: React.FC = () => {
  const {
    selectedTour,
    tourStepIndex,
    nextTourStep,
    prevTourStep,
    endTour,
    selectNode
  } = useGraphStore();

  const currentStep = useGraphStore(selectCurrentTourStep);

  if (!selectedTour || !currentStep) {
    return null;
  }

  const isFirstStep = tourStepIndex === 0;
  const isLastStep = tourStepIndex === selectedTour.steps.length - 1;

  // Navigate to current step's node
  React.useEffect(() => {
    if (currentStep.nodeId) {
      selectNode(currentStep.nodeId);
    }
  }, [currentStep.nodeId, selectNode]);

  return (
    <>
      {/* Overlay background */}
      <div className="tour-overlay" onClick={endTour} />

      {/* Tour content */}
      <div className="tour-content">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs font-medium rounded">
                Tour
              </span>
              <span className="text-xs text-gray-400">
                Step {tourStepIndex + 1} of {selectedTour.steps.length}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {selectedTour.title}
            </h3>
          </div>
          <button
            onClick={endTour}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${((tourStepIndex + 1) / selectedTour.steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
            {currentStep.title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {currentStep.content}
          </p>
        </div>

        {/* Dots indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {selectedTour.steps.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                // Go to step (need to add this functionality)
              }}
              className={clsx(
                'w-2 h-2 rounded-full transition-all',
                index === tourStepIndex
                  ? 'w-4 bg-indigo-500'
                  : index < tourStepIndex
                    ? 'bg-indigo-300 dark:bg-indigo-700'
                    : 'bg-gray-300 dark:bg-gray-600'
              )}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={endTour}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            Exit Tour
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={prevTourStep}
              disabled={isFirstStep}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                isFirstStep
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              ← Previous
            </button>
            {isLastStep ? (
              <button
                onClick={endTour}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
              >
                Complete ✓
              </button>
            ) : (
              <button
                onClick={nextTourStep}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Related nodes panel */}
      {currentStep.relatedNodeIds && currentStep.relatedNodeIds.length > 0 && (
        <div className="fixed right-4 bottom-24 w-64 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl p-4 animate-slide-in-up">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Related Topics
          </h4>
          <div className="space-y-2">
            {currentStep.relatedNodeIds.slice(0, 5).map(nodeId => (
              <button
                key={nodeId}
                onClick={() => selectNode(nodeId)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {nodeId}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default TourOverlay;
