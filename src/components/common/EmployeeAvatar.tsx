import React, { useState } from 'react';

interface EmployeeAvatarProps {
  avatar?: string | null;
  name: string;
  className?: string;
  fallbackClassName?: string;
}

export const EmployeeAvatar: React.FC<EmployeeAvatarProps> = ({
  avatar,
  name,
  className = 'w-12 h-12 rounded-2xl',
  fallbackClassName = 'font-black text-sm',
}) => {
  const [imageError, setImageError] = useState(false);

  const isUrl =
    Boolean(
      avatar &&
      typeof avatar === 'string' &&
      (avatar.startsWith('http://') ||
        avatar.startsWith('https://') ||
        avatar.startsWith('/') ||
        avatar.startsWith('data:image'))
    );

  const cleanName = (name || 'TM').trim();
  const initials =
    avatar && typeof avatar === 'string' && avatar.trim().length <= 3 && !avatar.includes('/')
      ? avatar.trim().toUpperCase()
      : cleanName
          .split(/\s+/)
          .filter(Boolean)
          .map((part) => part[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || cleanName.substring(0, 2).toUpperCase() || 'TM';

  if (isUrl && !imageError) {
    return (
      <img
        src={avatar!}
        alt={name}
        onError={() => setImageError(true)}
        className={`${className} object-cover`}
      />
    );
  }

  return <span className={fallbackClassName}>{initials}</span>;
};

export default EmployeeAvatar;
