import React from 'react';

interface LogoProps {
  className?: string;
  size?: number | string;
  color?: string;
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 120 }) => {
  const logoUrl = "https://images.unsplash.com/vector-1773298110594-c3b55a8db8ca?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwcm9maWxlLXBhZ2V8MXx8fGVufDB8fHx8fA%3D%3D";

  return (
    <div 
      className={`flex items-center justify-center overflow-hidden ${className}`} 
      style={{ width: size, height: size }}
    >
      <img 
        src={logoUrl} 
        alt="emPATİ Logo" 
        className="w-full h-full object-contain"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

export default Logo;
