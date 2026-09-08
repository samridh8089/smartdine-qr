'use client';

import React, { useState } from 'react';
import { QrCode, Printer, Download, Copy, Check, X, ShieldCheck } from 'lucide-react';
import { FloorPlanItem } from './types';

interface TableQRPopoverProps {
  table: FloorPlanItem | null;
  restaurantSlug: string;
  restaurantName?: string;
  qrDataUrl?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TableQRPopover: React.FC<TableQRPopoverProps> = ({
  table,
  restaurantSlug,
  restaurantName = 'The Foody Hub',
  qrDataUrl,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !table) return null;

  const tableUuid = table.table_uuid || table.id;
  const displayNumber = table.display_number || table.tableNumber || table.name.replace(/^Table\s*/i, '');
  const directUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/menu/${restaurantSlug}/tbl/${tableUuid}`
    : `https://www.cleverops.in/menu/${restaurantSlug}/tbl/${tableUuid}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPNG = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${restaurantSlug}-table-${displayNumber}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintSticker = () => {
    const printWindow = window.open('', '_blank', 'width=450,height=500');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Table ${displayNumber} QR - ${restaurantName}</title>
          <style>
            @page {
              size: 80mm 80mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 16px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              text-align: center;
              background: #FFFFFF;
              color: #171717;
            }
            .restaurant {
              font-size: 13px;
              font-weight: 600;
              letter-spacing: 0.05em;
              text-transform: uppercase;
              color: #525252;
              margin-bottom: 4px;
            }
            .table-badge {
              font-size: 22px;
              font-weight: 800;
              color: #171717;
              margin-bottom: 8px;
            }
            .qr-box {
              width: 160px;
              height: 160px;
              padding: 8px;
              background: #FFFFFF;
              border: 1px solid #E7E5E4;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .qr-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .cta {
              margin-top: 8px;
              font-size: 11px;
              font-weight: 600;
              color: #171717;
            }
            .sub {
              font-size: 9px;
              color: #737373;
              margin-top: 2px;
            }
          </style>
        </head>
        <body>
          <div class="restaurant">${restaurantName}</div>
          <div class="table-badge">Table ${displayNumber}</div>
          <div class="qr-box">
            <img src="${qrDataUrl || ''}" alt="QR" />
          </div>
          <div class="cta">Scan to View Menu & Order</div>
          <div class="sub">Powered by CleverOps</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-2xl max-w-sm w-full p-5 text-[#171717]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EFEDE8]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F5F5F4] border border-[#E7E5E4] flex items-center justify-center text-[#171717]">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#171717]">
                Table {displayNumber} QR Code
              </h3>
              <p className="text-[11px] text-[#737373]">Permanent Immutable Identity</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#737373] hover:text-[#171717] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Permanent QR Guarantee Alert */}
        <div className="mt-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-2.5 flex items-start space-x-2 text-[11px] text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Permanent QR Guarantee:</span> This code never changes or expires. You can freely rename or move this table without reprinting stickers.
          </div>
        </div>

        {/* QR Code Graphic Box */}
        <div className="my-4 flex flex-col items-center justify-center bg-[#F8F8F6] border border-[#E7E5E4] rounded-xl p-4">
          <div className="w-44 h-44 bg-white p-2.5 rounded-lg border border-[#E7E5E4] shadow-xs flex items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Table ${displayNumber} QR`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center text-xs text-[#737373]">
                Generating QR...
              </div>
            )}
          </div>
          <div className="mt-2.5 text-center">
            <span className="text-xs font-bold text-[#171717]">
              Table {displayNumber}
            </span>
            <span className="text-[10px] text-[#737373] block truncate max-w-[240px]">
              UUID: {tableUuid}
            </span>
          </div>
        </div>

        {/* Direct Link Box */}
        <div className="mb-4 flex items-center bg-[#F5F5F4] border border-[#E7E5E4] rounded-lg p-1.5 text-xs">
          <span className="text-[#737373] text-[11px] truncate flex-1 px-2 font-mono">
            /menu/{restaurantSlug}/tbl/{tableUuid.slice(0, 8)}...
          </span>
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-2.5 py-1 bg-white border border-[#E7E5E4] hover:bg-stone-50 rounded text-[11px] font-semibold text-[#171717] flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handlePrintSticker}
            className="py-2.5 px-3 bg-[#171717] hover:bg-[#262626] text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Sticker</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPNG}
            className="py-2.5 px-3 border border-[#E7E5E4] bg-white hover:bg-[#F5F5F4] text-[#171717] rounded-lg text-xs font-bold shadow-2xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
