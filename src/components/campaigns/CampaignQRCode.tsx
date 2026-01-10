'use client';

import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { Playfair_Display, Quicksand, Space_Grotesk, Bebas_Neue } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] });
const quicksand = Quicksand({ subsets: ['latin'], weight: ['700'] });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['700'] });
const bebasNeue = Bebas_Neue({ subsets: ['latin'], weight: ['400'] });

interface CampaignQRCodeProps {
  campaignUrl: string;
  campaignTitle: string;
}

type ThemeId = 'classic' | 'sunset' | 'midnight' | 'volt';

interface Theme {
  id: ThemeId;
  name: string;
  background: string;
  qrForeground: string;
  qrBackground: string;
  textColor: string;
  taglineColor: string;
  urlColor: string;
  fontClass: string;
}

const themes: Theme[] = [
  {
    id: 'classic',
    name: 'Classic',
    background: 'bg-stone-50',
    qrForeground: '#1c1917',
    qrBackground: '#fafaf9',
    textColor: 'text-stone-900',
    taglineColor: 'text-stone-500',
    urlColor: 'text-stone-400',
    fontClass: playfair.className,
  },
  {
    id: 'sunset',
    name: 'Sunset',
    background: 'bg-gradient-to-br from-rose-400 via-orange-300 to-amber-200',
    qrForeground: '#7c2d12',
    qrBackground: 'transparent',
    textColor: 'text-orange-950',
    taglineColor: 'text-orange-900/70',
    urlColor: 'text-orange-900/50',
    fontClass: quicksand.className,
  },
  {
    id: 'midnight',
    name: 'Midnight',
    background: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900',
    qrForeground: '#a5b4fc',
    qrBackground: 'transparent',
    textColor: 'text-indigo-200',
    taglineColor: 'text-indigo-300/70',
    urlColor: 'text-indigo-400/50',
    fontClass: spaceGrotesk.className,
  },
  {
    id: 'volt',
    name: 'Volt',
    background: 'bg-lime-400',
    qrForeground: '#1a2e05',
    qrBackground: '#a3e635',
    textColor: 'text-lime-950',
    taglineColor: 'text-lime-900/80',
    urlColor: 'text-lime-900/50',
    fontClass: bebasNeue.className,
  },
];

export default function CampaignQRCode({ campaignUrl, campaignTitle }: CampaignQRCodeProps) {
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>('classic');
  const [isGenerating, setIsGenerating] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const theme = themes.find((t) => t.id === selectedTheme) || themes[0];

  const handleDownload = async () => {
    if (!qrRef.current) return;

    setIsGenerating(true);
    try {
      const dataUrl = await toPng(qrRef.current, {
        quality: 1,
        pixelRatio: 3,
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = `${campaignTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-qr.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate QR code image:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-blue-200">
      <h4 className="font-medium text-blue-900 mb-3">QR Code for Stickers</h4>

      {/* Theme selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedTheme(t.id)}
            className={`px-3 py-1.5 text-sm rounded-full transition-all ${
              selectedTheme === t.id
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-blue-300 text-blue-700 hover:border-blue-400'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* QR Code preview */}
      <div className="flex justify-center mb-4">
        <div
          ref={qrRef}
          className={`p-6 rounded-lg ${theme.background} ${theme.fontClass}`}
          style={{ width: '280px' }}
        >
          <h5
            className={`text-center font-bold text-lg mb-4 ${theme.textColor}`}
            style={{ wordBreak: 'break-word' }}
          >
            {campaignTitle}
          </h5>
          <div className="flex justify-center">
            <QRCodeSVG
              value={campaignUrl}
              size={180}
              fgColor={theme.qrForeground}
              bgColor={theme.qrBackground}
              level="M"
              includeMargin={false}
            />
          </div>
          <p className={`text-center text-sm mt-3 ${theme.taglineColor}`}>
            Scan to take action
          </p>
          <p
            className={`text-center text-xs mt-1 ${theme.urlColor} truncate`}
            style={{ fontSize: '10px' }}
          >
            {campaignUrl.replace(/^https?:\/\//, '')}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <p className="text-xs text-blue-700 mb-3 text-center">
        Want printed stickers? Download your design and order from Sticker Mule.
      </p>
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="flex-1 px-4 py-2 text-sm border-2 border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating...' : 'Download Image'}
        </button>
        <a
          href="https://www.stickermule.com/unlock?ref_id=3679494801&utm_medium=link&utm_source=invite"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-4 py-2 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors text-center inline-flex items-center justify-center gap-1"
        >
          Order Stickers
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
