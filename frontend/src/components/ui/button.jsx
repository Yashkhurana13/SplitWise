import React from 'react';

export const Button = React.forwardRef(({ className, children, ...props }, ref) => {
  return <button ref={ref} className={`px-4 py-2 rounded font-medium text-white bg-teal-600 hover:bg-teal-700 ${className}`} {...props}>{children}</button>;
});
