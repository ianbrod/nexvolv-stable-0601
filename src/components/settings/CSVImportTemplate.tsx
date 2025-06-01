'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';

export function CSVImportTemplate() {
  const downloadComprehensiveTemplate = () => {
    const csvContent = `type,name,description,status,priority,color,dueDate,goalId,progress,category,createdAt,updatedAt
category,"Learn React Development","Master React.js for web development","","","#3b82f6","","","","","","",""
category,"Improve Physical Fitness","Focus on health and wellness goals","","","#10b981","","","","","","",""
category,"Career Growth","Professional development and advancement","","","#8b5cf6","","","","","","",""
goal,"Master React Fundamentals","Learn the core concepts of React including components, state, and props","active","","","2024-12-31","","75","Learn React Development","","",""
goal,"Build Portfolio Website","Create a professional portfolio showcasing my projects","active","","","2024-11-30","","50","Learn React Development","","",""
goal,"Run 5K Daily","Establish a consistent running routine","active","","","2024-12-15","","25","Improve Physical Fitness","","",""
goal,"Get Promoted","Achieve promotion to senior developer role","active","","","2025-06-30","","60","Career Growth","","",""
task,"Complete React tutorial","Finish the official React tutorial on reactjs.org","completed","high","","2024-10-15","Learn React Development","","",""
task,"Set up development environment","Install Node.js, VS Code, and necessary extensions","completed","medium","","2024-10-10","Learn React Development","","",""
task,"Build todo app","Create a simple todo application using React","in_progress","high","","2024-11-15","Learn React Development","","",""
task,"Learn React hooks","Study useState, useEffect, and other common hooks","todo","medium","","2024-11-20","Learn React Development","","",""
task,"Complete project proposal","Write and submit the quarterly project proposal","todo","high","","2024-12-31","Learn React Development","","",""
task,"Review team feedback","Analyze feedback from team members","in_progress","medium","","2024-12-15","Learn React Development","","",""
task,"Daily workout routine","Establish and maintain daily exercise habit","todo","high","","2024-12-20","Improve Physical Fitness","","",""`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comprehensive-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="py-3">
      <CardHeader className="px-4 pb-1">
        <CardTitle>CSV Import Template</CardTitle>
        <CardDescription>
          Download a template with sample data for importing.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 py-0">
        <div className="space-y-2">
          <Button
            onClick={downloadComprehensiveTemplate}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <div className="text-sm text-muted-foreground">
            <p>Template includes categories, goals, and tasks with sample data.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
