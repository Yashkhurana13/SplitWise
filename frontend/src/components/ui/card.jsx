import React from 'react';

export const Card = ({ children, className }) => <div className={`bg-white shadow rounded ${className}`}>{children}</div>;
export const CardHeader = ({ children, className }) => <div className={`p-4 border-b ${className}`}>{children}</div>;
export const CardTitle = ({ children, className }) => <h3 className={`text-lg font-bold ${className}`}>{children}</h3>;
export const CardContent = ({ children, className }) => <div className={`p-4 ${className}`}>{children}</div>;
export const CardFooter = ({ children, className }) => <div className={`p-4 border-t ${className}`}>{children}</div>;
