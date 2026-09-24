import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Printer, 
  Download, 
  Receipt, 
  TrendingUp, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Plus, 
  Trash2, 
  Edit3,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle2
} from 'lucide-react';
import { InvoiceData, InvoiceItem } from '../../types';

export const InvoiceModal: React.FC = () => {
  const { 
    isInvoiceModalOpen, 
    setIsInvoiceModalOpen, 
    selectedInvoice, 
    triggerToast 
  } = useApp();

  const [formData, setFormData] = useState<InvoiceData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedInvoice) {
      setFormData(selectedInvoice);
    }
  }, [selectedInvoice]);

  if (!isInvoiceModalOpen || !formData) return null;

  const handlePrint = () => {
    triggerToast('✓ Opening print dialogue for Invoice...');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownload = () => {
    triggerToast(`✓ Invoice #${formData.invoiceNumber} ready for PDF export`);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...formData.items];
    const item = { ...updatedItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? Number(value) : item.quantity;
      const p = field === 'unitPrice' ? Number(value) : item.unitPrice;
      item.total = q * p;
    }
    
    updatedItems[index] = item;
    
    // Recalculate subtotal and grand total
    const subTotal = updatedItems.reduce((acc, it) => acc + (it.total || 0), 0);
    const taxRate = formData.taxRate !== undefined ? formData.taxRate : 18;
    const taxAmount = (subTotal * taxRate) / 100;
    const grandTotal = subTotal + taxAmount;

    setFormData(prev => prev ? {
      ...prev,
      items: updatedItems,
      subTotal,
      taxAmount,
      grandTotal
    } : prev);
  };

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: 'Trading Desk Platform Services & Analytics',
      quantity: 1,
      unitPrice: 25000,
      total: 25000
    };
    const updatedItems = [...formData.items, newItem];
    const subTotal = updatedItems.reduce((acc, it) => acc + (it.total || 0), 0);
    const taxRate = formData.taxRate !== undefined ? formData.taxRate : 18;
    const taxAmount = (subTotal * taxRate) / 100;
    const grandTotal = subTotal + taxAmount;

    setFormData(prev => prev ? {
      ...prev,
      items: updatedItems,
      subTotal,
      taxAmount,
      grandTotal
    } : prev);
    triggerToast('✓ Item added to invoice');
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length <= 1) {
      triggerToast('Invoice must have at least one line item');
      return;
    }
    const updatedItems = formData.items.filter((_, i) => i !== index);
    const subTotal = updatedItems.reduce((acc, it) => acc + (it.total || 0), 0);
    const taxRate = formData.taxRate !== undefined ? formData.taxRate : 18;
    const taxAmount = (subTotal * taxRate) / 100;
    const grandTotal = subTotal + taxAmount;

    setFormData(prev => prev ? {
      ...prev,
      items: updatedItems,
      subTotal,
      taxAmount,
      grandTotal
    } : prev);
    triggerToast('Item removed');
  };

  const handleTaxChange = (taxRateVal: number) => {
    const taxRate = taxRateVal;
    const taxAmount = (formData.subTotal * taxRate) / 100;
    const grandTotal = formData.subTotal + taxAmount;

    setFormData(prev => prev ? {
      ...prev,
      taxRate,
      taxAmount,
      grandTotal
    } : prev);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[96vh]">
        
        {/* Top Header Bar */}
        <div className="bg-[#06152B] px-4 sm:px-6 py-3.5 text-white flex items-center justify-between border-b border-slate-800 print:hidden flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00C9A7]/20 text-[#00C9A7] flex items-center justify-center border border-[#00C9A7]/30">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white">Official Tax Invoice Generator</h3>
              <p className="text-[11px] text-slate-400">Trade Nexus Commercial Billing & Settlement</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isEditing ? 'bg-[#00C9A7] text-[#0A2540]' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Done Editing' : 'Edit Items'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-[#00C9A7]" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-xl bg-[#00C9A7] hover:bg-[#00A88B] text-[#0A2540] text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[#00C9A7]/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save PDF</span>
            </button>

            <button
              onClick={() => setIsInvoiceModalOpen(false)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div ref={scrollRef} className="overflow-y-auto flex-1 p-3 sm:p-8 bg-slate-100/80 flex justify-center">
          
          {/* Printable Invoice Sheet matching Template 5 (5.png) */}
          <div 
            id="printable-invoice"
            className="printable-document-sheet w-full max-w-[720px] bg-white text-slate-800 shadow-xl rounded-xl sm:rounded-2xl overflow-hidden relative border border-slate-200 font-sans print:shadow-none print:border-none print:m-0 print:p-0 print:rounded-none"
            style={{ 
              minHeight: '940px',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}
          >
            {/* Top Navy/Teal Geometric Header matching 5.png */}
            <div 
              className="doc-printable-header relative text-white p-6 sm:p-8 pb-10 overflow-hidden flex-shrink-0"
              style={{
                backgroundColor: '#06152B',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
                colorAdjust: 'exact'
              }}
            >
              {/* Decorative background polygon */}
              <div 
                className="absolute right-0 top-0 bottom-0 w-2/5 bg-gradient-to-l from-[#00C9A7]/20 to-transparent pointer-events-none" 
                style={{ clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0% 100%)' }}
              />
              <div 
                className="absolute right-0 bottom-0 h-2 bg-[#00C9A7] w-full"
              />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                {/* Brand & Logo */}
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00C9A7] to-[#0A2540] flex items-center justify-center shadow-lg border border-[#00C9A7]/40">
                      <TrendingUp className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h1 className="font-display font-extrabold text-2xl tracking-wider text-white">TRADE NEXUS</h1>
                      <p className="text-[10px] font-semibold text-[#00C9A7] tracking-widest uppercase">THE ONLY SMART WAY TO TRADE</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mt-3 max-w-xs leading-relaxed">
                    Trade Nexus Financial Technologies Pvt. Ltd.<br />
                    Level 12, Nexus Cyber Tower, HITEC City, Hyderabad - 500081
                  </p>
                </div>

                {/* INVOICE Title and Badge */}
                <div className="text-left sm:text-right">
                  <h2 className="font-display font-black text-3xl sm:text-4xl tracking-tight text-white mb-2">
                    INVOICE
                  </h2>
                  <div className="inline-block bg-[#00C9A7]/20 border border-[#00C9A7]/50 rounded-lg px-3 py-1 text-xs font-bold text-[#00C9A7]">
                    #{formData.invoiceNumber}
                  </div>
                  <div className="mt-3 text-xs text-slate-300 space-y-0.5">
                    <p><span className="text-slate-400">Date:</span> <span className="font-semibold text-white">{formData.date}</span></p>
                    <p><span className="text-slate-400">Due Date:</span> <span className="font-semibold text-white">{formData.dueDate || '10 July 2025'}</span></p>
                    <p><span className="text-slate-400">Status:</span> <span className="font-bold text-[#00C9A7] uppercase">{formData.status}</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To / Invoice Details Section */}
            <div className="p-6 sm:p-8 pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/80 p-5 rounded-xl border border-slate-200/80 mb-6">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#00C9A7] mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    INVOICE TO (CLIENT)
                  </p>
                  {isEditing ? (
                    <div className="space-y-2 mt-2">
                      <input 
                        type="text"
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                        className="w-full text-xs font-bold p-1.5 border border-slate-300 rounded bg-white"
                        placeholder="Client / Company Name"
                      />
                      <input 
                        type="text"
                        value={formData.clientCompany || ''}
                        onChange={(e) => setFormData({ ...formData, clientCompany: e.target.value })}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white"
                        placeholder="Organization Name"
                      />
                      <input 
                        type="text"
                        value={formData.clientAddress}
                        onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                        className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white"
                        placeholder="Client Address"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text"
                          value={formData.clientEmail || ''}
                          onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white"
                          placeholder="Email"
                        />
                        <input 
                          type="text"
                          value={formData.clientPhone}
                          onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                          className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white"
                          placeholder="Phone"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{formData.clientName}</h4>
                      <p className="text-xs font-medium text-slate-700">{formData.clientCompany || 'Corporate Client'}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{formData.clientAddress}</p>
                      <p className="text-xs text-slate-500 mt-1">{formData.clientEmail} • {formData.clientPhone}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#06152B] mb-1.5 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#00C9A7]" />
                    PAYMENT & TAX DETAILS
                  </p>
                  <div className="text-xs space-y-1 text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Invoice Ref:</span>
                      <span className="font-semibold text-slate-800">{formData.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">GSTIN:</span>
                      <span className="font-semibold text-slate-800">36AAACT9182N1Z8</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Term:</span>
                      <span className="font-semibold text-slate-800">Net 15 Days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Currency:</span>
                      <span className="font-bold text-[#06152B]">INR (₹)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table matching Template 5 */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-6 shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#06152B] text-white">
                      <th className="py-3 px-3 w-10 text-center font-bold">#</th>
                      <th className="py-3 px-4 font-bold">ITEM DESCRIPTION</th>
                      <th className="py-3 px-3 text-center w-16 font-bold">QTY</th>
                      <th className="py-3 px-4 text-right w-28 font-bold">UNIT PRICE</th>
                      <th className="py-3 px-4 text-right w-28 font-bold">TOTAL</th>
                      {isEditing && <th className="py-3 px-2 w-10 text-center print:hidden">DEL</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {formData.items.map((item, idx) => (
                      <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="py-3 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input 
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                              className="w-full p-1 border border-slate-300 rounded text-xs"
                            />
                          ) : (
                            <span className="font-semibold text-slate-800">{item.description}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isEditing ? (
                            <input 
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className="w-14 p-1 border border-slate-300 rounded text-xs text-center"
                            />
                          ) : (
                            <span className="text-slate-700 font-medium">{item.quantity}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isEditing ? (
                            <input 
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                              className="w-24 p-1 border border-slate-300 rounded text-xs text-right"
                            />
                          ) : (
                            <span className="text-slate-700 font-medium">₹{Number(item.unitPrice).toLocaleString('en-IN')}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#06152B]">
                          ₹{Number(item.total).toLocaleString('en-IN')}
                        </td>
                        {isEditing && (
                          <td className="py-3 px-2 text-center print:hidden">
                            <button 
                              onClick={() => handleRemoveItem(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {isEditing && (
                  <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex justify-end print:hidden">
                    <button
                      onClick={handleAddItem}
                      className="px-3 py-1.5 rounded-lg bg-[#00C9A7]/20 hover:bg-[#00C9A7]/30 text-[#0A2540] font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#00A88B]" />
                      <span>Add Invoice Item</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Summary & Banking info matching Template 5 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                
                {/* Left: Payment Info and Note */}
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    <h5 className="font-extrabold text-[#06152B] uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#00C9A7]" />
                      Payment Information
                    </h5>
                    <div className="space-y-1 text-slate-600">
                      <p><span className="font-semibold text-slate-800">Bank Name:</span> {formData.bankName}</p>
                      <p><span className="font-semibold text-slate-800">Account No:</span> {formData.accountNumber}</p>
                      <p><span className="font-semibold text-slate-800">IFSC / SWIFT:</span> {formData.ifscCode || 'HDFC0001234'}</p>
                      <p><span className="font-semibold text-slate-800">Payment ID:</span> {formData.paymentEmail}</p>
                    </div>
                  </div>

                  <div className="bg-[#00C9A7]/5 border border-[#00C9A7]/20 p-3.5 rounded-xl text-xs">
                    <p className="font-bold text-[#0A2540] mb-1">Important Terms & Notes:</p>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {formData.note || 'Payment is due within 15 days of invoice date. All payments subject to Trade Nexus enterprise services master agreement.'}
                    </p>
                  </div>
                </div>

                {/* Right: Calculations & Totals Callout */}
                <div className="space-y-2">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between py-1 text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-bold text-slate-800">₹{Number(formData.subTotal).toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex justify-between py-1 text-slate-600">
                      <span className="flex items-center gap-1">
                        GST ({formData.taxRate !== undefined ? formData.taxRate : 18}%):
                        {isEditing && (
                          <input 
                            type="number"
                            value={formData.taxRate !== undefined ? formData.taxRate : 18}
                            onChange={(e) => handleTaxChange(Number(e.target.value))}
                            className="w-12 p-0.5 text-xs border rounded text-right ml-1"
                          />
                        )}
                      </span>
                      <span className="font-semibold text-slate-800">₹{Number(formData.taxAmount || 0).toLocaleString('en-IN')}</span>
                    </div>

                    <div className="border-t-2 border-slate-300 pt-2 mt-2">
                      <div className="bg-[#06152B] text-white p-3.5 rounded-xl flex justify-between items-center shadow-md">
                        <span className="font-extrabold text-sm uppercase tracking-wider">TOTAL DUE</span>
                        <span className="font-extrabold text-xl text-[#00C9A7]">
                          ₹{Number(formData.grandTotal).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Thank you & Signature */}
                  <div className="flex items-end justify-between pt-4 px-2">
                    <div>
                      <span className="font-serif italic font-bold text-2xl text-slate-400">Thank You!</span>
                      <p className="text-[10px] text-slate-400">We appreciate your business</p>
                    </div>

                    <div className="text-right">
                      <div className="h-10 flex items-center justify-end">
                        <span 
                          className="text-xl font-bold text-slate-800 tracking-wider"
                          style={{ fontFamily: "'Brush Script MT', 'Great Vibes', 'Caveat', cursive" }}
                        >
                          Samira Hadid
                        </span>
                      </div>
                      <div className="w-36 h-0.5 bg-slate-300 ml-auto mb-1"></div>
                      <p className="text-[11px] font-bold text-slate-800">Samira Hadid</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider">Head of Finance & Accounts</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Navy Wave and Contact Footer Bar matching Template 5 */}
            <div 
              className="doc-printable-footer mt-8 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-[10px] flex-shrink-0"
              style={{
                backgroundColor: '#06152B',
                borderTop: '3px solid #00C9A7',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
                colorAdjust: 'exact'
              }}
            >
              <div className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-[#00C9A7]" />
                <span>Level 12, Nexus Cyber Tower, HITEC City, Hyderabad</span>
              </div>
              <div className="flex items-center gap-4 text-slate-300">
                <div className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#00C9A7]" />
                  <span>+91 98765 43210</span>
                </div>
                <div className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-[#00C9A7]" />
                  <span>info@tradenexus.com</span>
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-[#00C9A7]" />
                  <span>www.tradenexus.com</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
