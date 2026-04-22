import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#1d4ed8',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '7px',
          position: 'relative',
        }}
      >
        {/* Three candlestick bars (green trend up) */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', paddingBottom: '4px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
            <div style={{ width: '1.5px', height: '3px', background: 'rgba(255,255,255,0.6)' }} />
            <div style={{ width: '5px', height: '7px', background: 'rgba(255,255,255,0.75)', borderRadius: '1px' }} />
            <div style={{ width: '1.5px', height: '2px', background: 'rgba(255,255,255,0.6)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
            <div style={{ width: '1.5px', height: '3px', background: '#34d399' }} />
            <div style={{ width: '5px', height: '9px', background: '#34d399', borderRadius: '1px' }} />
            <div style={{ width: '1.5px', height: '2px', background: '#34d399' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
            <div style={{ width: '1.5px', height: '2px', background: '#34d399' }} />
            <div style={{ width: '5px', height: '12px', background: '#34d399', borderRadius: '1px' }} />
            <div style={{ width: '1.5px', height: '2px', background: '#34d399' }} />
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
