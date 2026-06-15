import React from 'react';

export const Alert = ({ children, variant, className }) => <div className={`p-4 rounded border ${variant === 'destructive' ? 'bg-red-50 text-red-900 border-red-200' : 'bg-gray-50 border-gray-200'} ${className}`}>{children}</div>;
export const AlertDescription = ({ children, className }) => <div className={`text-sm ${className}`}>{children}</div>;
