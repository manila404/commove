import React from 'react';
import {
    Globe,
    Flame,
    Music,
    Mic,
    Briefcase,
    HeartPulse,
    Dumbbell,
    Heart,
    Wrench,
    Landmark,
    FileText,
    Users,
    Bike,
    Tag,
} from 'lucide-react';

export interface CategoryStyle {
    bg: string;          // Gradient classes for category card/background (e.g. 'from-... to-...')
    subtitle: string;
    icon: React.ElementType;
    badge: string;       // Tailwind classes for pill badges (bg, text, border, dark mode variants)
    fadeColor: string;   // Hex color used for gradient fade (e.g. in HighlightsSlider)
}

export const CATEGORY_DATA: Record<string, CategoryStyle> = {
    'All': {
        bg: 'from-[#0052A3] to-[#003f7f]',
        subtitle: 'Everything',
        icon: Globe,
        badge: 'bg-blue-50 text-[#0052A3] border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50',
        fadeColor: '#003f7f'
    },
    'Happening Now': {
        bg: 'from-[#f87171] to-[#ef4444]',
        subtitle: 'Live',
        icon: Flame,
        badge: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50',
        fadeColor: '#ef4444'
    },
    'Conference': {
        bg: 'from-[#60a5fa] to-[#3b82f6]',
        subtitle: 'Learn',
        icon: Mic,
        badge: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50',
        fadeColor: '#3b82f6'
    },
    'Sports': {
        bg: 'from-[#818cf8] to-[#6366f1]',
        subtitle: 'Active',
        icon: Dumbbell,
        badge: 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50',
        fadeColor: '#6366f1'
    },
    'Business': {
        bg: 'from-[#64748b] to-[#475569]',
        subtitle: 'Network',
        icon: Briefcase,
        badge: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-800',
        fadeColor: '#475569'
    },
    'Social Welfare': {
        bg: 'from-[#38bdf8] to-[#0ea5e9]',
        subtitle: 'Community',
        icon: Heart,
        badge: 'bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/50',
        fadeColor: '#0ea5e9'
    },
    'Health and Wellness': {
        bg: 'from-[#c084fc] to-[#a855f7]',
        subtitle: 'Wellness',
        icon: HeartPulse,
        badge: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50',
        fadeColor: '#a855f7'
    },
    'Concerts': {
        bg: 'from-[#34d399] to-[#10b981]',
        subtitle: 'Music',
        icon: Music,
        badge: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
        fadeColor: '#10b981'
    },
    'Workshop': {
        bg: 'from-[#fb923c] to-[#f97316]',
        subtitle: 'Skills',
        icon: Wrench,
        badge: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50',
        fadeColor: '#f97316'
    },
    'Government Services': {
        bg: 'from-[#fbbf24] to-[#f59e0b]',
        subtitle: 'Services',
        icon: Landmark,
        badge: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50',
        fadeColor: '#f59e0b'
    },
    'Civil Registry': {
        bg: 'from-[#f87171] to-[#ef4444]',
        subtitle: 'Records',
        icon: FileText,
        badge: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50',
        fadeColor: '#ef4444'
    },
    'Community Services': {
        bg: 'from-[#2dd4bf] to-[#14b8a6]',
        subtitle: 'Together',
        icon: Users,
        badge: 'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/50',
        fadeColor: '#14b8a6'
    },
    'Recreation': {
        bg: 'from-[#a3e635] to-[#65a30d]',
        subtitle: 'Fun',
        icon: Bike,
        badge: 'bg-lime-50 text-lime-600 border-lime-200 dark:bg-lime-950/40 dark:text-lime-300 dark:border-lime-900/50',
        fadeColor: '#65a30d'
    },
};

// Fallback style for custom categories not found in configuration
export const DEFAULT_STYLE: CategoryStyle = {
    bg: 'from-[#0052A3] to-[#003f7f]',
    subtitle: 'Event',
    icon: Tag,
    badge: 'bg-blue-50 text-[#0052A3] border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50',
    fadeColor: '#003f7f'
};

/**
 * Normalizes input and fetches category styles.
 * If multiple categories are provided, resolves style using the first category.
 */
export function getCategoryStyle(categories: string[] | string | undefined | null): CategoryStyle {
    if (!categories) return DEFAULT_STYLE;
    const catArray = Array.isArray(categories) ? categories : [categories];
    const primaryCat = catArray[0];
    if (!primaryCat) return DEFAULT_STYLE;
    return CATEGORY_DATA[primaryCat] || DEFAULT_STYLE;
}
