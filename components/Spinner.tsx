import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-10 w-10 border-4',
    lg: 'h-16 w-16 border-4',
  };

  return (
    <div className={`
      ${sizeClasses[size]}
      rounded-full
      border-gray-300
      dark:border-gray-600
      border-t-primary-600
      dark:border-t-primary-400
      animate-spin
    `}></div>
  );
};

export default Spinner;