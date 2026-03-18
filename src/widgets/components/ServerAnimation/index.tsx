import React from 'react';
import { WidgetComponentProps, WidgetRegistryEntry } from '../../types';

const ServerAnimation: React.FC<WidgetComponentProps> = ({ width, height }) => {
  return (
    <div style={{
      width,
      height,
      backgroundColor: 'transparent',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes blinkOrange {
          0%, 100% { opacity: 1; box-shadow: 0 0 12px 2px rgba(255, 167, 0, 0.7); }
          50% { opacity: 0.5; box-shadow: 0 0 2px 0px rgba(255, 167, 0, 0.2); }
        }
        @keyframes blinkRed {
          0%, 100% { opacity: 1; box-shadow: 0 0 12px 2px rgba(255, 77, 77, 0.7); }
          50% { opacity: 0.3; box-shadow: 0 0 2px 0px rgba(255, 77, 77, 0.2); }
        }
      `}</style>

      {/* Server centered */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 20,
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          {/* Upper server module */}
          <div style={{
            width: 320,
            height: 96,
            backgroundColor: '#E8ECEF',
            borderRadius: 16,
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 32px',
            position: 'relative',
            overflow: 'hidden',
            borderBottom: '6px solid #D1D5DB',
            borderLeft: '2px solid #F3F4F6',
            borderRight: '2px solid #F3F4F6',
            borderTop: '2px solid #F3F4F6',
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '45%',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.7), transparent)',
              pointerEvents: 'none',
            }} />
            <div style={{
              width: 128,
              height: 20,
              backgroundColor: '#374151',
              borderRadius: 9999,
              marginRight: 'auto',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)',
            }} />
            <span style={{
              fontFamily: 'monospace',
              fontSize: 24,
              fontWeight: 800,
              color: '#4F73FF',
              marginRight: 16,
              letterSpacing: '0.05em',
            }}>AI</span>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{
                width: 18,
                height: 18,
                backgroundColor: '#FFA700',
                borderRadius: '50%',
                animation: 'blinkOrange 3s ease-in-out infinite',
              }} />
              <div style={{
                width: 18,
                height: 18,
                backgroundColor: '#FF4D4D',
                borderRadius: '50%',
                animation: 'blinkRed 1.5s ease-in-out infinite',
                animationDelay: '0.7s',
              }} />
            </div>
          </div>

          {/* Connector */}
          <div style={{
            width: 144,
            height: 32,
            backgroundColor: '#2C333F',
            position: 'relative',
            boxShadow: 'inset 0 4px 6px rgba(0,0,0,0.4)',
            borderLeft: '6px solid #1F242D',
            borderRight: '6px solid #1F242D',
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-evenly',
              padding: '6px 16px',
              opacity: 0.3,
            }}>
              <div style={{ height: 2, backgroundColor: '#9CA3AF', width: '100%', borderRadius: 9999 }} />
              <div style={{ height: 2, backgroundColor: '#9CA3AF', width: '100%', borderRadius: 9999 }} />
            </div>
          </div>

          {/* Lower server module */}
          <div style={{
            width: 320,
            height: 96,
            backgroundColor: '#E8ECEF',
            borderRadius: 16,
            boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 32px',
            position: 'relative',
            overflow: 'hidden',
            borderBottom: '6px solid #D1D5DB',
            borderLeft: '2px solid #F3F4F6',
            borderRight: '2px solid #F3F4F6',
            borderTop: '2px solid #F3F4F6',
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '45%',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.7), transparent)',
              pointerEvents: 'none',
            }} />
            <div style={{
              width: 128,
              height: 20,
              backgroundColor: '#374151',
              borderRadius: 9999,
              marginRight: 'auto',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)',
            }} />
            <span style={{
              fontFamily: 'monospace',
              fontSize: 24,
              fontWeight: 800,
              color: '#4F73FF',
              marginRight: 16,
              letterSpacing: '0.05em',
            }}>AI</span>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{
                width: 18,
                height: 18,
                backgroundColor: '#FFA700',
                borderRadius: '50%',
                animation: 'blinkOrange 3s ease-in-out infinite',
                animationDelay: '1.2s',
              }} />
              <div style={{
                width: 18,
                height: 18,
                backgroundColor: '#FF4D4D',
                borderRadius: '50%',
                animation: 'blinkRed 1.5s ease-in-out infinite',
                animationDelay: '0.3s',
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const serverAnimationWidget: WidgetRegistryEntry = {
  name: 'serverAnimation',
  displayName: 'Server Animation',
  description: 'AI Server mit 2 Modulen, blinkenden LEDs und Connector',
  icon: 'S',
  component: ServerAnimation,
  nativeWidth: 500,
  nativeHeight: 350,
  defaultFps: 30,
  defaultDurationInFrames: 150,
  defaultElementWidth: 500,
  defaultElementHeight: 350,
};
