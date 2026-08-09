import React from 'react';
import { Pharmacy, Sale, SaleItem } from '../types';
import { generateReceiptPdf } from '../lib/pdf';
import { Printer, Download, Share2, CheckCircle, X } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  pharmacy: Pharmacy | null;
  sale: Sale | null;
  saleItems: SaleItem[];
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  pharmacy,
  sale,
  saleItems,
}) => {
  if (!isOpen || !pharmacy || !sale) return null;

  const currency = pharmacy.currency || 'KSh';

  const handleShareWhatsapp = () => {
    let text = `*RECEIPT - ${pharmacy.name}*\n`;
    text += `Invoice #: ${sale.sale_number}\n`;
    text += `Date: ${new Date(sale.created_at).toLocaleString()}\n`;
    text += `--------------------------------\n`;
    saleItems.forEach(i => {
      text += `• ${i.product_name} x${i.quantity} = ${currency} ${i.subtotal.toFixed(2)}\n`;
    });
    text += `--------------------------------\n`;
    if (sale.discount > 0) text += `Discount: -${currency} ${sale.discount.toFixed(2)}\n`;
    text += `*TOTAL PAID: ${currency} ${sale.total.toFixed(2)}*\n`;
    text += `Payment: ${sale.payment_method.toUpperCase()}\n\n`;
    text += `_Thank you for trusting ${pharmacy.name}. Get well soon!_`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header Success Badge */}
        <div className="bg-emerald-950/60 border-b border-emerald-800/60 p-4 text-center relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-1 animate-bounce" />
          <h2 className="text-base font-bold text-emerald-300">Sale Completed!</h2>
          <p className="text-xs text-slate-300 font-mono mt-0.5">#{sale.sale_number}</p>
        </div>

        {/* Receipt Paper Simulation Body */}
        <div className="p-4 bg-white text-slate-900 font-mono text-xs overflow-y-auto space-y-3 shadow-inner">
          <div className="text-center pb-2 border-b border-dashed border-slate-300">
            <h3 className="font-bold text-sm text-slate-950 uppercase">{pharmacy.name}</h3>
            <p className="text-[10px] text-slate-600 leading-tight">{pharmacy.address}</p>
            <p className="text-[10px] text-slate-600">Tel: {pharmacy.phone}</p>
          </div>

          <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2">
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date(sale.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Time:</span>
              <span>{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex justify-between">
              <span>Staff:</span>
              <span>{sale.sold_by_name || 'Cashier'}</span>
            </div>
            {sale.customer_name && (
              <div className="flex justify-between font-bold text-slate-800">
                <span>Customer:</span>
                <span>{sale.customer_name}</span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2">
            {saleItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-[11px]">
                <div className="flex-1 pr-2">
                  <div className="font-semibold leading-tight">{item.product_name}</div>
                  <div className="text-[10px] text-slate-500">
                    {item.quantity} x {currency} {item.unit_price.toFixed(2)}
                  </div>
                </div>
                <div className="font-bold">{currency} {item.subtotal.toFixed(2)}</div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1 pt-1">
            {sale.discount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Discount:</span>
                <span>-{currency} {sale.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm text-slate-950 pt-1 border-t border-slate-900">
              <span>TOTAL PAID:</span>
              <span>{currency} {sale.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-600 pt-1">
              <span>Method:</span>
              <span className="uppercase font-bold">{sale.payment_method}</span>
            </div>
          </div>

          <div className="text-center pt-3 text-[10px] text-slate-500 italic border-t border-dashed border-slate-300">
            {pharmacy.receipt_footer || 'Get well soon! Thank you for your business.'}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-3 bg-slate-800 border-t border-slate-700 grid grid-cols-3 gap-2 shrink-0">
          <button
            onClick={() => generateReceiptPdf(pharmacy, sale, saleItems, 'print')}
            className="flex flex-col items-center justify-center p-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-xl text-[11px] font-semibold transition-colors"
          >
            <Printer className="w-4 h-4 mb-1 text-emerald-400" />
            <span>Print</span>
          </button>

          <button
            onClick={() => generateReceiptPdf(pharmacy, sale, saleItems, 'download')}
            className="flex flex-col items-center justify-center p-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-xl text-[11px] font-semibold transition-colors"
          >
            <Download className="w-4 h-4 mb-1 text-teal-400" />
            <span>PDF</span>
          </button>

          <button
            onClick={handleShareWhatsapp}
            className="flex flex-col items-center justify-center p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold transition-colors"
          >
            <Share2 className="w-4 h-4 mb-1" />
            <span>WhatsApp</span>
          </button>
        </div>

        <div className="p-2 bg-slate-900 border-t border-slate-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
          >
            Done & New Sale
          </button>
        </div>

      </div>
    </div>
  );
};
