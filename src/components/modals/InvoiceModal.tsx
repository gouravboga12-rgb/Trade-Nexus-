import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Printer, Download, Plus, Trash2, TrendingUp, Phone, Mail, Globe } from 'lucide-react';
import { InvoiceData, InvoiceItem } from '../../types';

const makeEmptyInvoice = (): Omit<InvoiceData, 'id'> => ({
  invoiceNumber: `TNX-INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`,
  date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
  billTo: { name: '', phone: '', address: '' },
  from: { name: 'Trade Nexus Corporate Billing', phone: '+91 98765 43210', address: '123 Business Avenue, Financial District, 500001' },
  items: [{ id: 'item-1', description: '', qty: 1, price: 0, total: 0 }],
  subTotal: 0,
  total: 0,
  notes: 'Payment is due within 15 days of invoice date.',
  paymentInfo: { bankName: 'HDFC Bank - Corporate Banking', accountNumber: '50200049281729', email: 'billing@tradenexus.com' },
});

export const InvoiceModal: React.FC = () => {
  const {
    isInvoiceModalOpen,
    setIsInvoiceModalOpen,
    selectedInvoice,
    setSelectedInvoice,
    invoices,
    generateInvoice,
    triggerToast,
  } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<InvoiceData, 'id'>>(makeEmptyInvoice());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isInvoiceModalOpen && scrollRef.current) scrollRef.current.scrollTop = 0;
    if (isInvoiceModalOpen && !selectedInvoice && invoices.length > 0) {
      setSelectedInvoice(invoices[0]);
    }
  }, [isInvoiceModalOpen]);

  if (!isInvoiceModalOpen) return null;

  const inv = selectedInvoice;

  const handlePrint = () => {
    triggerToast('Opening print dialog...');
    setTimeout(() => window.print(), 100);
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setForm(prev => {
      const items = prev.items.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        updated.total = updated.qty * updated.price;
        return updated;
      });
      const subTotal = items.reduce((s, i) => s + i.total, 0);
      return { ...prev, items, subTotal, total: subTotal };
    });
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { id: `item-${Date.now()}`, description: '', qty: 1, price: 0, total: 0 }],
    }));
  };

  const removeItem = (id: string) => {
    setForm(prev => {
      const items = prev.items.filter(i => i.id !== id);
      const subTotal = items.reduce((s, i) => s + i.total, 0);
      return { ...prev, items, subTotal, total: subTotal };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.billTo.name.trim()) return;
    generateInvoice(form);
    setShowForm(false);
    setForm(makeEmptyInvoice());
  };

  if (showForm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[96vh]">
          <div className="bg-[#06152B] px-5 py-3.5 text-white flex items-center justify-between border-b border-slate-800 flex-shrink-0">
            <span className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#00C9A7]" /> Create Invoice
            </span>
            <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
            {/* Invoice Number & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Invoice #</label>
                <input value={form.invoiceNumber} onChange={e => setForm(p => ({ ...p, invoiceNumber: e.target.value }))} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Date</label>
                <input value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
              </div>
            </div>

            {/* Bill To */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-700">Bill To *</h4>
              <input required value={form.billTo.name} onChange={e => setForm(p => ({ ...p, billTo: { ...p.billTo, name: e.target.value } }))} placeholder="Client Name / Company" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
              <input value={form.billTo.phone} onChange={e => setForm(p => ({ ...p, billTo: { ...p.billTo, phone: e.target.value } }))} placeholder="Phone" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
              <input value={form.billTo.address} onChange={e => setForm(p => ({ ...p, billTo: { ...p.billTo, address: e.target.value } }))} placeholder="Address" className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7]" />
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-700">Line Items</h4>
                <button type="button" onClick={addItem} className="text-[10px] font-bold text-[#00A88B] flex items-center gap-1 hover:underline">
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>
              <div className="space-y-2">
                {form.items.map((item) => (
                  <div key={item.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Description" className="flex-1 p-2 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none focus:border-[#00C9A7] text-[11px]" />
                      <button type="button" onClick={() => removeItem(item.id)} className="text-rose-400 hover:text-rose-600 flex-shrink-0 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-0.5">QTY</label>
                        <input type="number" value={item.qty} onChange={e => updateItem(item.id, 'qty', Number(e.target.value))} className="w-full p-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-medium focus:outline-none focus:border-[#00C9A7]" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-0.5">PRICE (₹)</label>
                        <input type="number" value={item.price} onChange={e => updateItem(item.id, 'price', Number(e.target.value))} className="w-full p-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-medium focus:outline-none focus:border-[#00C9A7]" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-0.5">TOTAL</label>
                        <div className="w-full p-1.5 rounded-lg border border-slate-100 bg-slate-100 text-[11px] font-bold text-[#00A88B]">₹{item.total.toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-1">
                <span className="text-sm font-black text-[#0A2540]">Total: <span className="text-[#00A88B]">₹{form.total.toLocaleString('en-IN')}</span></span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium focus:outline-none focus:border-[#00C9A7] resize-none" />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="py-2.5 px-4 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 text-xs">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black shadow-md hover:brightness-105 text-xs">Generate Invoice</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[96vh]">

        {/* Top Control Bar */}
        <div className="bg-[#06152B] px-4 sm:px-6 py-3 text-white flex items-center justify-between border-b border-slate-800 print:hidden flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00C9A7] animate-pulse" />
            <span className="font-bold text-xs sm:text-sm tracking-wide text-slate-200">Tax Invoice</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowForm(true); setForm(makeEmptyInvoice()); }} className="px-3 py-1.5 rounded-xl bg-[#00C9A7]/20 hover:bg-[#00C9A7]/30 text-[#00C9A7] text-xs font-bold flex items-center gap-1.5 transition-all">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
            <button onClick={handlePrint} className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5 text-[#00C9A7]" />
              <span className="hidden xs:inline">Print / PDF</span>
            </button>
            <button onClick={() => { setIsInvoiceModalOpen(false); setSelectedInvoice(null); }} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List Selector */}
        {invoices.length > 1 && (
          <div className="print:hidden flex-shrink-0 bg-slate-50 border-b border-slate-200 px-4 py-2 overflow-x-auto">
            <div className="flex gap-2 text-xs">
              {invoices.map(i => (
                <button key={i.id} onClick={() => setSelectedInvoice(i)}
                  className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all ${inv?.id === i.id ? 'bg-[#0A2540] text-[#00C9A7]' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-400'}`}>
                  {i.invoiceNumber}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Document Container */}
        <div ref={scrollRef} className="overflow-y-auto flex-1 p-2 sm:p-5 bg-slate-100/70 flex justify-center">
          {!inv ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <p className="text-slate-400 text-sm font-medium">No invoice to display.</p>
              <button onClick={() => { setShowForm(true); setForm(makeEmptyInvoice()); }} className="px-4 py-2 rounded-xl bg-[#00C9A7] text-[#0A2540] font-black text-xs flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Create First Invoice
              </button>
            </div>
          ) : (
            <div id="invoice-sheet" className="w-full bg-white text-slate-800 shadow-md rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200"
              style={{ minHeight: '780px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>

              {/* Header */}
              <div className="relative text-white px-5 sm:px-7 pt-5 pb-4 overflow-hidden" style={{ backgroundColor: '#06152B', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <div className="absolute -bottom-1 left-0 right-0 h-2.5" style={{ backgroundColor: '#00A88B', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
                <div className="absolute bottom-1 left-0 w-3/5 h-1" style={{ backgroundColor: '#38E1B7', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00C9A7] to-[#0A2540] p-0.5 shadow-md flex items-center justify-center flex-shrink-0">
                      <div className="w-full h-full rounded-full flex items-center justify-center text-[#00C9A7]" style={{ backgroundColor: '#06152B' }}>
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                      </div>
                    </div>
                    <div>
                      <h1 className="font-display font-black text-sm sm:text-xl text-white tracking-wider leading-none">TRADE NEXUS</h1>
                      <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                        <span className="h-px w-3 sm:w-4 bg-[#00C9A7]" />
                        <span className="text-[7px] sm:text-[9px] font-extrabold tracking-[0.2em] text-[#00C9A7]">TRADE SMART</span>
                        <span className="h-px w-3 sm:w-4 bg-[#00C9A7]" />
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <h2 className="font-display font-black text-xs sm:text-lg text-white tracking-wider uppercase">TAX INVOICE</h2>
                    <div className="h-0.5 w-full bg-[#00C9A7] mt-0.5" />
                    <p className="text-[10px] font-mono text-slate-300 mt-0.5">{inv.invoiceNumber}</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-7 space-y-4">

                {/* Bill To / From Grid */}
                <div className="grid grid-cols-2 gap-4 text-[11px] sm:text-xs border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <p className="font-black text-[9px] uppercase text-slate-400 tracking-widest">Bill From</p>
                    <p className="font-display font-extrabold text-[#0A2540]">{inv.from.name}</p>
                    <p className="text-slate-500">{inv.from.address}</p>
                    <p className="flex items-center gap-1 text-slate-600"><Phone className="w-2.5 h-2.5 text-[#00A88B]" /> {inv.from.phone}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-[9px] uppercase text-slate-400 tracking-widest">Bill To</p>
                    <p className="font-display font-extrabold text-[#0A2540]">{inv.billTo.name}</p>
                    <p className="text-slate-500">{inv.billTo.address}</p>
                    <p className="flex items-center gap-1 text-slate-600"><Phone className="w-2.5 h-2.5 text-[#00A88B]" /> {inv.billTo.phone}</p>
                  </div>
                </div>

                {/* Date */}
                <div className="text-right text-[11px] sm:text-xs text-slate-500">
                  Invoice Date: <strong className="text-slate-800">{inv.date}</strong>
                </div>

                {/* Items Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden text-[11px] sm:text-xs">
                  <div className="grid grid-cols-12 bg-[#0A2540] text-white font-bold text-[10px] px-3 py-2" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <span className="col-span-6">DESCRIPTION</span>
                    <span className="col-span-2 text-center">QTY</span>
                    <span className="col-span-2 text-right">PRICE</span>
                    <span className="col-span-2 text-right">TOTAL</span>
                  </div>
                  {inv.items.map((item, idx) => (
                    <div key={item.id} className={`grid grid-cols-12 px-3 py-2 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                      <span className="col-span-6 text-slate-700">{item.description}</span>
                      <span className="col-span-2 text-center text-slate-600">{item.qty}</span>
                      <span className="col-span-2 text-right text-slate-600">₹{item.price.toLocaleString('en-IN')}</span>
                      <span className="col-span-2 text-right font-bold text-slate-800">₹{item.total.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="space-y-1.5 text-xs w-48">
                    <div className="flex justify-between text-slate-600">
                      <span>Sub Total:</span>
                      <span className="font-bold text-slate-800">₹{inv.subTotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-1.5" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <span className="font-black text-[#0A2540]">TOTAL:</span>
                      <span className="font-black text-[#00A88B] text-sm">₹{inv.total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {inv.notes && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] sm:text-xs text-slate-600 space-y-1">
                    <p className="font-bold text-slate-700">Notes:</p>
                    <p>{inv.notes}</p>
                  </div>
                )}

                {/* Payment Info */}
                <div className="bg-[#E6FAF6] border border-[#00C9A7]/30 rounded-xl p-3 text-[11px] sm:text-xs space-y-1" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <p className="font-black text-[#0A2540] text-[10px] uppercase tracking-widest">Payment Info</p>
                  <p><span className="text-slate-500">Bank:</span> <strong>{inv.paymentInfo.bankName}</strong></p>
                  <p><span className="text-slate-500">Account:</span> <strong className="font-mono">{inv.paymentInfo.accountNumber}</strong></p>
                  <p><span className="text-slate-500">Email:</span> <strong>{inv.paymentInfo.email}</strong></p>
                </div>
              </div>

              {/* Footer */}
              <div className="text-white px-4 sm:px-6 py-2.5 border-t-2 border-[#00A88B] flex items-center justify-between text-[9px] sm:text-[11px] gap-2 font-medium"
                style={{ backgroundColor: '#06152B', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <span className="flex items-center gap-1 text-slate-200"><Phone className="w-3 h-3 text-[#00C9A7]" /> +91 98765 43210</span>
                <span className="text-slate-600">|</span>
                <span className="flex items-center gap-1 text-slate-200"><Mail className="w-3 h-3 text-[#00C9A7]" /> billing@tradenexus.com</span>
                <span className="text-slate-600">|</span>
                <span className="flex items-center gap-1 text-slate-200 truncate"><Globe className="w-3 h-3 text-[#00C9A7]" /> www.tradenexus.com</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden flex-shrink-0">
          <button type="button" onClick={() => { setIsInvoiceModalOpen(false); setSelectedInvoice(null); }}
            className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-100 text-xs">Close</button>
          <button type="button" onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00A88B] to-[#00C9A7] text-[#0A2540] font-black text-xs shadow-sm hover:brightness-105 flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};
