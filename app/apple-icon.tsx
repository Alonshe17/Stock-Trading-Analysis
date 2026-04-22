import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(145deg, #1e40af, #2563eb)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
        }}
      >
        {/* Candlestick chart */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end' }}>
          {/* Candle 1 — mixed/white */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <div style={{ width: '4px', height: '14px', background: 'rgba(255,255,255,0.5)', borderRadius: '2px' }} />
            <div style={{ width: '22px', height: '34px', background: 'rgba(255,255,255,0.7)', borderRadius: '4px' }} />
            <div style={{ width: '4px', height: '10px', background: 'rgba(255,255,255,0.5)', borderRadius: '2px' }} />
          </div>
          {/* Candle 2 — green */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <div style={{ width: '4px', height: '16px', background: '#34d399', borderRadius: '2px' }} />
            <div style={{ width: '22px', height: '48px', background: '#10b981', borderRadius: '4px' }} />
            <div style={{ width: '4px', height: '10px', background: '#34d399', borderRadius: '2px' }} />
          </div>
          {/* Candle 3 — green (tallest = breakout) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <div style={{ width: '4px', height: '12px', background: '#34d399', borderRadius: '2px' }} />
            <div style={{ width: '22px', height: '64px', background: '#10b981', borderRadius: '4px' }} />
            <div style={{ width: '4px', height: '8px', background: '#34d399', borderRadius: '2px' }} />
          </div>
        </div>

        {/* App name */}
        <div
          style={{
            color: 'white',
            fontSize: '22px',
            fontWeight: 'bold',
            letterSpacing: '3px',
            opacity: 0.9,
          }}
        >
          STA
        </div>
      </div>
    ),
    { ...size },
  );
}
