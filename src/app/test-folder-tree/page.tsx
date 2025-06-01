'use client';

import React from 'react';
import { FolderTreeView } from '@/components/captainslog/FolderTreeView';

export default function TestFolderTreePage() {
  const handleNodeSelect = (node: any) => {
    console.log('Selected node:', node);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Folder Tree Test</h1>
      
      <div className="border rounded-md p-4 w-64">
        <FolderTreeView onSelectNode={handleNodeSelect} />
      </div>
    </div>
  );
}
