import React, { useState, useCallback, useMemo } from 'react';
import { useGraphStore } from '../store';
import Fuse from 'fuse.js';
import clsx from 'clsx';
import type { KGNode, SearchResult } from '@understand-anything/core';

export const SearchPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const { graph, selectNode, setSearchResults } = useGraphStore();

  // Fuse.js setup for fuzzy search
  const fuse = useMemo(() => {
    if (!graph) return null;
    const nodes = Array.from(graph.nodes.values());
    return new Fuse(nodes, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'displayName', weight: 1.5 },
        { name: 'description', weight: 1 },
        { name: 'tags', weight: 1.5 },
        { name: 'signature', weight: 0.8 }
      ],
      threshold: 0.4,
      includeScore: true,
      includeMatches: true
    });
  }, [graph]);

  // Search results
  const results = useMemo((): SearchResult[] => {
    if (!fuse || !query.trim()) return [];
    
    const searchResults = fuse.search(query, { limit: 10 });
    return searchResults.map(result => ({
      node: result.item,
      score: 1 - (result.score || 0),
      matches: [],
      context: result.item.description?.substring(0, 100) || ''
    }));
  }, [fuse, query]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedIndex(0);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      selectNode(results[selectedIndex].node.id);
      setIsOpen(false);
      setQuery('');
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  }, [results, selectedIndex, selectNode]);

  // Handle result click
  const handleResultClick = useCallback((result: SearchResult) => {
    selectNode(result.node.id);
    setIsOpen(false);
    setQuery('');
  }, [selectNode]);

  return (
    <div className="relative">
      {/* Search button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg border',
          'border-gray-200 dark:border-gray-700 shadow-sm',
          'hover:border-gray-300 dark:hover:border-gray-600 transition-colors'
        )}
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-sm text-gray-500">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
          <span>⌘</span><span>K</span>
        </kbd>
      </button>

      {/* Search dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl z-50 animate-fade-in">
          {/* Input */}
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Search nodes..."
              autoFocus
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-900 rounded border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {results.length > 0 ? (
              results.map((result, index) => (
                <button
                  key={result.node.id}
                  onClick={() => handleResultClick(result)}
                  className={clsx(
                    'w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors',
                    index === selectedIndex && 'bg-indigo-50 dark:bg-indigo-900/30'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        'px-1.5 py-0.5 text-xs rounded',
                        getNodeTypeColor(result.node.type)
                      )}>
                        {result.node.type}
                      </span>
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {result.node.displayName}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {Math.round(result.score * 100)}%
                    </span>
                  </div>
                  {result.context && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                      {result.context}
                    </p>
                  )}
                </button>
              ))
            ) : query.trim() ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">No results found</p>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                <p className="text-sm">Start typing to search...</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
              <span>esc close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getNodeTypeColor(type: string): string {
  const colors: Record<string, string> = {
    file: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
    function: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    method: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
    class: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    interface: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    module: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    constant: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    type: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
    variable: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300'
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
}

export default SearchPanel;
