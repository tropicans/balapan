import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CyberButton } from '../components/ui/CyberButton.jsx';
import { Printer, QrCode } from 'lucide-react';

export function DeskQRCodes() {
  const handlePrint = () => {
    window.print();
  };

  const lanes = [
    {
      id: 'A',
      title: 'LINE A // JALUR 1',
      qrValue: 'LINE A',
      border: 'border-neonPink shadow-glowPink',
      text: 'text-neonPink',
      bg: 'bg-neonPink/10',
      badge: 'bg-neonPink text-black'
    },
    {
      id: 'B',
      title: 'LINE B // JALUR 2',
      qrValue: 'LINE B',
      border: 'border-neonCyan shadow-glowCyan',
      text: 'text-neonCyan',
      bg: 'bg-neonCyan/10',
      badge: 'bg-neonCyan text-black'
    },
    {
      id: 'C',
      title: 'LINE C // JALUR 3',
      qrValue: 'LINE C',
      border: 'border-neonGreen shadow-glowGreen',
      text: 'text-neonGreen',
      bg: 'bg-neonGreen/10',
      badge: 'bg-neonGreen text-black'
    },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="bg-obsidian border border-neonCyan/40 p-4 clip-cyber flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neonCyan/20 border border-neonCyan flex items-center justify-center clip-cyber">
            <QrCode className="w-6 h-6 text-neonCyan" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-orbitron font-black text-white">
              QR CODE MEJA LINTASAN (LINE A, B, C)
            </h2>
            <p className="text-xs font-mono text-neonCyan">
              Tampilkan di tablet atau cetak untuk ditempel di meja start masing-masing jalur.
            </p>
          </div>
        </div>

        <CyberButton
          variant="cyan"
          size="md"
          icon={Printer}
          onClick={handlePrint}
        >
          CETAK QR CODE
        </CyberButton>
      </div>

      {/* 3 Lane Desk Stencils */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {lanes.map(l => (
          <div
            key={l.id}
            className={`p-6 md:p-8 bg-obsidian border-2 ${l.border} clip-cyber text-center flex flex-col items-center justify-between min-h-[380px]`}
          >
            <div>
              <div className={`inline-block px-3 py-1 font-orbitron font-black text-xs uppercase clip-cyber mb-4 ${l.badge}`}>
                DGDASH RACETRACK
              </div>
              <h3 className={`text-2xl font-black font-orbitron ${l.text} tracking-wider`}>
                {l.title}
              </h3>
            </div>

            {/* QR Code Graphic */}
            <div className="p-4 bg-white rounded-lg shadow-2xl my-6 inline-block">
              <QRCodeSVG
                value={l.qrValue}
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>

            <div>
              <div className="text-sm font-orbitron font-bold text-white tracking-widest">
                SCAN DENGAN HP PESERTA
              </div>
              <p className="text-[11px] font-mono text-cyberSilver/60 mt-1">
                Kupon terpotong 1 saat Race Director mengunci balapan
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
