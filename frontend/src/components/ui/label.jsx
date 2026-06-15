import React from 'react';

export const Label = React.forwardRef(({ className, children, ...props }, ref) => {
  return <label ref={ref} className={`block text-sm font-medium text-gray-700 ${className}`} {...props}>{children}</label>;
});
