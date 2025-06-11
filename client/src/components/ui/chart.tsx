// Placeholder file - chart component disabled due to compatibility issues
import React from 'react';

export type ChartConfig = Record<string, unknown>;

// Dummy implementations to prevent import errors
export const ChartContainer: React.FC<{children?: React.ReactNode}> = ({children}) => {
  return <div className="h-full flex items-center justify-center">{children}</div>;
};

export const PieChart: React.FC = () => {
  return <div>Chart disabled</div>;
};

export const LineChart: React.FC = () => {
  return <div>Chart disabled</div>;
};

export const BarChart: React.FC = () => {
  return <div>Chart disabled</div>;
};

// Expose any other required exports
export const ChartTooltip: React.FC = () => null;