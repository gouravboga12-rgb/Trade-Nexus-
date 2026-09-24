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

  const cleanAvatar = avatar && typeof avatar === 'string' ? avatar.trim() : '';

  const isLikelyUrl =
    cleanAvatar.startsWith('http://') ||
    cleanAvatar.startsWith('https://') ||
    cleanAvatar.startsWith('/') ||
    cleanAvatar.startsWith('data:image') ||
    cleanAvatar.startsWith('//') ||
    cleanAvatar.includes('unsplash.com') ||
    cleanAvatar.includes('cloudfront.net') ||
    cleanAvatar.includes('amazonaws.com') ||
    /\.(jpg|jpeg|png|webp|svg|gif)($|\?)/i.test(cleanAvatar);

  // Normalize URL if protocol is missing (e.g. unsplash.com/... or //images...)
  const imageUrl = isLikelyUrl
    ? cleanAvatar.startsWith('//')
      ? `https:${cleanAvatar}`
      : !cleanAvatar.startsWith('http') && !cleanAvatar.startsWith('/') && !cleanAvatar.startsWith('data:')
      ? `https://${cleanAvatar}`
      : cleanAvatar
    : null;

  // Extract clean 2-letter initials (never render a long text string or raw URL)
  const getInitials = () => {
    if (cleanAvatar && cleanAvatar.length <= 3 && !cleanAvatar.includes('/') && !cleanAvatar.includes('.')) {
      return cleanAvatar.toUpperCase();
    }
    const cleanName = (name || 'TM').trim();
    const parts = cleanName.split(/\s+/).map((p) => p[0]).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0] + parts[1]).toUpperCase();
    }
    return cleanName.substring(0, 2).toUpperCase() || 'TM';
  };

  const initials = getInitials();

  if (imageUrl && !imageError) {
    return (
      <img
        src={imageUrl}
        alt={name}
        onError={() => setImageError(true)}
        className={`${className} object-cover`}
      />
    );
  }

  return <span className={fallbackClassName}>{initials}</span>;
};

export default EmployeeAvatar;
