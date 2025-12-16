import { useMemo } from 'react';

interface GridConfig {
  columns: {
    base: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
  };
  gap: {
    base: string;
    sm: string;
  };
  itemPadding: {
    base: string;
    sm: string;
  };
  iconSizes: {
    folder: {
      list: string;
      grid: string;
    };
    file: {
      sm: string;
      md: string;
      lg: string;
    };
  };
  textSize: {
    base: string;
    xs: string;
  };
}

/**
 * Hook to provide responsive grid configuration based on screen size
 * This centralizes all responsive design decisions for grid layouts
 */
export const useResponsiveGrid = (): GridConfig => {
  // For now, we return a static configuration
  // In the future, this could be made dynamic based on actual screen detection
  return useMemo(() => ({
    columns: {
      base: 3,
      xs: 4,
      sm: 5,
      md: 6,
      lg: 7,
      xl: 8,
      '2xl': 10
    },
    gap: {
      base: '0.25rem', // 1px on smaller screens
      sm: '0.375rem'   // 1.5px on larger screens
    },
    itemPadding: {
      base: '0.5rem',  // 2px padding
      sm: '0.625rem'   // 2.5px padding
    },
    iconSizes: {
      folder: {
        list: 'w-5 h-5',
        grid: 'w-12 h-12'
      },
      file: {
        sm: 'w-5 h-5',
        md: 'w-12 h-12',
        lg: 'w-20 h-20'
      }
    },
    textSize: {
      base: '0.75rem', // text-xs
      xs: '0.875rem'   // text-sm
    }
  }), []);
};

/**
 * Utility function to generate Tailwind classes for grid layout
 */
export const getGridClassNames = (config: GridConfig): string => {
  return [
    'grid',
    `grid-cols-${config.columns.base}`,
    `xs:grid-cols-${config.columns.xs}`,
    `sm:grid-cols-${config.columns.sm}`,
    `md:grid-cols-${config.columns.md}`,
    `lg:grid-cols-${config.columns.lg}`,
    `xl:grid-cols-${config.columns.xl}`,
    `2xl:grid-cols-${config.columns['2xl']}`,
    `gap-${config.gap.base.replace('.', '-')}`,
    `sm:gap-${config.gap.sm.replace('.', '-')}`
  ].join(' ');
};

/**
 * Utility function to generate Tailwind classes for grid item styling
 */
export const getGridItemClassNames = (config: GridConfig, additionalClasses?: string): string => {
  const baseClasses = [
    'flex',
    'flex-col',
    'items-center',
    `p-${config.itemPadding.base.replace('.', '-')}`,
    `sm:p-${config.itemPadding.sm.replace('.', '-')}`,
    'rounded-lg',
    'transition-all',
    'duration-200',
    'hover:scale-[1.03]',
    'hover:shadow-md',
    'active:scale-[0.98]'
  ];
  
  if (additionalClasses) {
    baseClasses.push(additionalClasses);
  }
  
  return baseClasses.join(' ');
};

/**
 * Utility function to generate Tailwind classes for file name text
 */
export const getFileNameClassNames = (config: GridConfig): string => {
  return [
    'text-center',
    'break-words',
    'w-full',
    'text-foreground',
    'group-hover:text-accent-foreground',
    `text-${config.textSize.base.replace('.', '-')}`,
    `xs:text-${config.textSize.xs.replace('.', '-')}`
  ].join(' ');
};

/**
 * Utility function to get appropriate icon size classes based on item type and view mode
 */
export const getItemIconClasses = (config: GridConfig, itemType: 'folder' | 'file', viewMode: 'grid' | 'list'): string => {
  if (itemType === 'folder') {
    return viewMode === 'grid' ? config.iconSizes.folder.grid : config.iconSizes.folder.list;
  } else {
    // For files, we'll use medium size as default in grid view
    return viewMode === 'grid' ? config.iconSizes.file.md : config.iconSizes.file.sm;
  }
};
