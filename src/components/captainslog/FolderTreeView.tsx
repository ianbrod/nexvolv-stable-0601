'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, FolderIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Category, Goal } from '@/types';
import { getCategoriesForCaptainsLog, getGoalsForCategory } from '@/actions/captainslog-categories';

// Define interfaces for our component
interface TreeNode {
  id: string;
  name: string;
  type: 'category' | 'goal';
  color?: string;
  parentId?: string;
  children?: TreeNode[];
}

interface FolderTreeViewProps {
  onSelectNode?: (node: TreeNode) => void;
  className?: string;
}

export function FolderTreeView({ onSelectNode, className }: FolderTreeViewProps) {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories and goals data
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        // Fetch categories from the Goals page
        const categoriesResult = await getCategoriesForCaptainsLog();

        if (!categoriesResult.success) {
          throw new Error(categoriesResult.error || 'Failed to fetch categories');
        }

        const categories = categoriesResult.data || [];

        // Transform categories into tree nodes
        const nodes: TreeNode[] = [];

        // Process each category
        for (const category of categories) {
          const categoryNode: TreeNode = {
            id: category.id,
            name: category.name,
            type: 'category',
            color: category.color,
            children: []
          };

          // Don't auto-expand any folders by default
          // Fetch goals for this category
          const goalsResult = await getGoalsForCategory(category.id);

          if (goalsResult.success && goalsResult.data) {
            // Add goals as children of this category
            categoryNode.children = goalsResult.data.map(goal => ({
              id: goal.id,
              name: goal.name,
              type: 'goal',
              parentId: category.id
            }));
          }

          nodes.push(categoryNode);
        }

        setTreeData(nodes);
      } catch (error) {
        console.error('Error fetching folder tree data:', error);
        setError('Failed to load folder structure. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Handle node expansion toggle
  const toggleNodeExpansion = async (nodeId: string, nodeType: 'category' | 'goal', e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering node selection

    // Check if the node is already expanded
    const isExpanded = expandedNodes.has(nodeId);

    if (isExpanded) {
      // Collapse the node
      setExpandedNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      });
    } else {
      // Expand the node
      setExpandedNodes(prev => {
        const newSet = new Set(prev);
        newSet.add(nodeId);
        return newSet;
      });

      // If it's a category and we don't have its goals yet, fetch them
      if (nodeType === 'category') {
        const categoryNode = treeData.find(node => node.id === nodeId);

        if (categoryNode && (!categoryNode.children || categoryNode.children.length === 0)) {
          try {
            const goalsResult = await getGoalsForCategory(nodeId);

            if (goalsResult.success && goalsResult.data) {
              // Update the tree data with the fetched goals
              setTreeData(prevData => {
                return prevData.map(node => {
                  if (node.id === nodeId) {
                    return {
                      ...node,
                      children: goalsResult.data.map(goal => ({
                        id: goal.id,
                        name: goal.name,
                        type: 'goal',
                        parentId: nodeId
                      }))
                    };
                  }
                  return node;
                });
              });
            }
          } catch (error) {
            console.error(`Error fetching goals for category ${nodeId}:`, error);
          }
        }
      }
    }
  };

  // Handle node selection
  const handleNodeSelect = (node: TreeNode) => {
    setSelectedNodeId(node.id);
    if (onSelectNode) {
      onSelectNode(node);
    }
  };

  // Render a tree node
  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNodeId === node.id;

    // Style based on node type
    const nodeStyle = node.type === 'category' && node.color
      ? { borderLeft: `3px solid ${node.color}` }
      : {};

    return (
      <div key={node.id} className="flex flex-col">
        <Button
          variant="ghost"
          style={nodeStyle}
          className={cn(
            "w-full justify-start text-left pl-2 h-8 my-0.5",
            isSelected && "bg-muted font-medium",
            node.type === 'category' && "font-medium",
            node.type === 'goal' && "text-sm"
          )}
          onClick={() => handleNodeSelect(node)}
        >
          <div
            className="flex items-center w-full"
            style={{ paddingLeft: `${level * 12}px` }}
          >
            {/* Expand/collapse button for nodes with children */}
            {(hasChildren || node.type === 'category') && (
              <div
                onClick={(e) => toggleNodeExpansion(node.id, node.type, e)}
                className="mr-1 p-1 hover:bg-gray-200 rounded-sm cursor-pointer"
              >
                {isExpanded ?
                  <ChevronDown className="h-3 w-3" /> :
                  <ChevronRight className="h-3 w-3" />
                }
              </div>
            )}

            {/* Show folder icon for categories */}
            {node.type === 'category' && (
              <FolderIcon className="mr-2 h-4 w-4" />
            )}

            <span className="truncate">{node.name}</span>
          </div>
        </Button>

        {/* Render children if expanded */}
        {isExpanded && hasChildren && (
          <div className="ml-2">
            {node.children!.map(childNode => renderTreeNode(childNode, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="p-4">Loading folder structure...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className={cn("w-full overflow-y-auto", className)}>
      <div className="space-y-1">
        {treeData.map(node => renderTreeNode(node))}
      </div>
    </div>
  );
}
