import React from 'react';

// Splits description text into plain text, URLs, and hashtags for rich rendering.
// URLs become clickable links (open in new tab); hashtags are highlighted blue.

const URL_RE     = /https?:\/\/[^\s)\]'"]+|www\.[^\s)\]'"]+/g;
const HASHTAG_RE = /#[A-Za-z0-9_À-ɏ]+/g;
const TOKEN_RE   = new RegExp(`(${URL_RE.source}|${HASHTAG_RE.source})`, 'g');

interface RichTextProps {
    text: string;
    className?: string;
}

const RichText: React.FC<RichTextProps> = ({ text, className }) => {
    if (!text) return null;

    const parts = text.split(TOKEN_RE);

    return (
        <span className={className}>
            {parts.map((part, i) => {
                if (/^https?:\/\//i.test(part) || /^www\./i.test(part)) {
                    const href = /^www\./i.test(part) ? `https://${part}` : part;
                    return (
                        <a
                            key={i}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-blue-500 dark:text-blue-400 underline underline-offset-2 break-all hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                        >
                            {part}
                        </a>
                    );
                }
                if (/^#[A-Za-z0-9_À-ɏ]+$/.test(part)) {
                    return (
                        <span key={i} className="text-blue-500 dark:text-blue-400 font-medium">
                            {part}
                        </span>
                    );
                }
                return <React.Fragment key={i}>{part}</React.Fragment>;
            })}
        </span>
    );
};

export default RichText;
