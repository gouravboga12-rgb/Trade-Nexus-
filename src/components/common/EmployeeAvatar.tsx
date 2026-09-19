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
    avatar &&
    typeof avatar === 'string' &&
    (avatar.startsWith('http://') ||
      avatar.startsWith('https://') ||
      avatar.startsWith('/') ||
      avatar.startsWith('data:image'));

  const initials =
    avatar && typeof avatar === 'string' && avatar.length <= 3 && !avatar.startsWith('/')
      ? avatar
      : (name || 'TM')
          .split(' ')
          .map((part) => part[0])
          .slice(0, 2)
          .join('')
          .toUpperCase() || name.substring(0, 2).toUpperCase();

  if (isUrl && !imageError) {
    return (
      <img
        src={avatar}
        alt={name}
        onError={() => setImageError(true)}
        className={`${className} object-cover`}
      />
    );
  }

  return <span className={fallbackClassName}>{initials}</span>;
};

export default EmployeeAvatar;
