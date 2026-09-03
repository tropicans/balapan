import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CyberButton } from '../components/ui/CyberButton.jsx';
import { Printer, QrCode, Scissors } from 'lucide-react';

export function DeskQRCodes() {
  const handlePrint = () => {
    window.print();
  };

  const lanes = [
    {
      id: 'A',
      title: 'LINE A // JALUR 1',
      shortTitle: 'LINE A',
      laneNumber: 'JALUR 1',
      qrValue: 'LINE A',
      border: 'border-neonPink shadow-glowPink',
      text: 'text-neonPink',
      bg: 'bg-neonPink/10',
      badge: 'bg-neonPink text-black',
      printColor: '#ff0055',
      printBadgeBg: '#ffe6ed'
    },
    {
      id: 'B',
      title: 'LINE B // JALUR 2',
      shortTitle: 'LINE B',
      laneNumber: 'JALUR 2',
      qrValue: 'LINE B',
      border: 'border-neonCyan shadow-glowCyan',
      text: 'text-neonCyan',
      bg: 'bg-neonCyan/10',
      badge: 'bg-neonCyan text-black',
      printColor: '#00b8d4',
      printBadgeBg: '#e0f7fa'
    },
    {
      id: 'C',
      title: 'LINE C // JALUR 3',
      shortTitle: 'LINE C',
      laneNumber: 'JALUR 3',
      qrValue: 'LINE C',
      border: 'border-neonGreen shadow-glowGreen',
      text: 'text-neonGreen',
      bg: 'bg-neonGreen/10',
      badge: 'bg-neonGreen text-black',
      printColor: '#00c853',
      printBadgeBg: '#e8f5e9'
    },
  ];

  return (
    <>
      {/* =========================================================
          ON-SCREEN VIEW (Cyberpunk HUD Theme - Hidden on Print)
         ========================================================= */}
      <div className="max-w-5xl mx-auto p-4 space-y-6 print:hidden">
        <div className="bg-obsidian border border-neonCyan/40 p-4 clip-cyber flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neonCyan/20 border border-neonCyan flex items-center justify-center clip-cyber flex-shrink-0">
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

        {/* 3 Lane Desk Cards */}
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

      {/* =========================================================
          PRINT-ONLY SHEET (High-Contrast, Pure White, 1 Page A4)
         ========================================================= */}
      <div className="hidden print:block w-full max-w-[200mm] mx-auto text-black bg-white font-sans">
        {/* Document Header */}
        <div className="border-b-2 border-black pb-2 mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black tracking-wider uppercase">
              DGDASH RACING SYSTEM — STARTING BOX QR CODES
            </h1>
            <p className="text-[11px] text-gray-700">
              Gunting lembar ini sesuai garis putus-putus dan tempelkan di meja start masing-masing jalur.
            </p>
          </div>
          <div className="text-right text-[10px] text-gray-500 font-mono">
            <div>TARGET: 3 LANES (A, B, C)</div>
            <div>VERIFIED 1-PAGE SHEET</div>
          </div>
        </div>

        {/* 3 Strips Stacked Cleanly on 1 Page */}
        <div className="space-y-3">
          {lanes.map((l, index) => (
            <React.Fragment key={l.id}>
              {index > 0 && (
                <div className="flex items-center gap-2 py-1 text-gray-400 text-[10px] font-mono">
                  <Scissors className="w-3.5 h-3.5" />
                  <div className="flex-1 border-t-2 border-dashed border-gray-400" />
                  <span>GUNTING DI SINI (CUT HERE)</span>
                  <div className="flex-1 border-t-2 border-dashed border-gray-400" />
                </div>
              )}

              <div 
                className="print-strip border-2 border-black rounded-lg p-3 bg-white flex items-center justify-between gap-4"
                style={{ borderLeftWidth: '8px', borderLeftColor: l.printColor }}
              >
                {/* Left: Lane Info */}
                <div className="w-[30%] space-y-1">
                  <div 
                    className="inline-block px-2.5 py-0.5 text-[11px] font-black uppercase rounded tracking-wider border"
                    style={{ borderColor: l.printColor, color: l.printColor, backgroundColor: l.printBadgeBg }}
                  >
                    STARTING BOX
                  </div>
                  <h2 className="text-2xl font-black tracking-tight" style={{ color: l.printColor }}>
                    {l.shortTitle}
                  </h2>
                  <div className="text-lg font-bold text-gray-900 leading-none">
                    {l.laneNumber}
                  </div>
                  <p className="text-[10px] text-gray-600 pt-1 leading-tight">
                    Tempatkan mobil di starting box jalur ini sebelum memindai.
                  </p>
                </div>

                {/* Center: Sharp Vector QR Code */}
                <div className="w-[32%] flex flex-col items-center justify-center p-1.5 border border-gray-300 rounded bg-white">
                  <QRCodeSVG
                    value={l.qrValue}
                    size={120}
                    level="H"
                    includeMargin={false}
                  />
                  <div className="text-[10px] font-mono font-bold tracking-widest text-gray-800 mt-1">
                    VALUE: [{l.qrValue}]
                  </div>
                </div>

                {/* Right: Participant Instructions */}
                <div className="w-[38%] pl-2 border-l border-gray-200 space-y-1 text-left">
                  <div className="text-xs font-black uppercase text-gray-900 tracking-wider">
                    PETUNJUK PEMBALAP (HP):
                  </div>
                  <ol className="text-[10px] text-gray-800 space-y-0.5 list-decimal list-inside leading-tight font-medium">
                    <li>Buka menu <b>Peserta (HP)</b> di smartphone.</li>
                    <li>Arahkan kamera HP ke QR Code di samping.</li>
                    <li>Tekan tombol jempol <b>"SIAP BALAP"</b>.</li>
                  </ol>
                  <div className="text-[9px] text-gray-600 bg-gray-100 p-1.5 rounded border border-gray-200 mt-1 leading-tight">
                    ⚡ <b>Info Kupon</b>: Kupon terpotong 1 saat Race Director mengunci heat balapan.
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
}
