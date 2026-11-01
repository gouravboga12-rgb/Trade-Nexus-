import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Printer, 
  Download, 
  Receipt, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Plus, 
  Trash2, 
  Edit3,
  Building2,
  CreditCard
} from 'lucide-react';
import { InvoiceData, InvoiceItem } from '../../types';
import { api } from '../../services/api';
import watermarkEmblem from '../../assets/watermark-emblem.png';
import logoIcon from '../../assets/logo-icon.png';

export const InvoiceModal: React.FC = () => {
  const { 
    isInvoiceModalOpen, 
    setIsInvoiceModalOpen, 
    selectedInvoice, 
    resendInvoiceEmail,
    updateInvoice,
    triggerToast 
  } = useApp();

  const [formData, setFormData] = useState<InvoiceData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedInvoice) {
      setFormData(selectedInvoice);
    }
  }, [selectedInvoice]);

  useEffect(() => {
    if (isInvoiceModalOpen && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [isInvoiceModalOpen]);

  if (!isInvoiceModalOpen || !formData) return null;

  const handlePrint = () => {
    triggerToast('✓ Opening print dialogue for Invoice...');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownload = async () => {
    try {
      triggerToast(`⏳ Generating & downloading official Tax Invoice PDF #${formData.invoiceNumber}...`);
      await api.downloadInvoice(formData);
      triggerToast(`✓ Official Tax Invoice PDF downloaded successfully!`);
    } catch (err: any) {
      triggerToast(`⚠️ Download failed: ${err.message || 'Server error'}`);
    }
  };

  const handleToggleEdit = async () => {
    if (isEditing && formData) {
      const ok = await updateInvoice(formData);
      if (ok) triggerToast('✓ Invoice changes saved');
    }
    setIsEditing(!isEditing);
  };

  const handleSendEmail = async () => {
    if (!formData?.clientEmail) {
      triggerToast('⚠️ Customer email address is required');
      return;
    }
    setIsSendingEmail(true);
    try {
      const saved = await updateInvoice(formData);
      if (!saved) return;
      setIsEditing(false);
      triggerToast(`Generating PDF & sending to ${formData.clientEmail}...`);
      await resendInvoiceEmail(formData.id);
      setFormData(prev => prev ? { ...prev, status: 'SENT' } : prev);
    } catch (err: any) {
      triggerToast(`⚠️ Email dispatch failed: ${err.message || 'Error'}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const setField = <K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) =>
    setFormData(prev => prev ? { ...prev, [key]: value } : prev);

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...formData.items];
    const item = { ...updatedItems[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? Number(value) : Number(item.quantity);
      const p = field === 'unitPrice' ? Number(value) : Number(item.unitPrice);
      item.total = q * p;
    }

    updatedItems[index] = item;
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
      description: 'Consulting & Advisory Services',
      quantity: 1,
      unitPrice: 5000,
      total: 5000
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
    triggerToast('Line item added');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-none sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[96vh] printable-modal-dialog print:max-w-none print:rounded-none print:border-none print:shadow-none print:max-h-none print:h-auto">
        
        {/* Top Header Controls Bar (Responsive on Mobile) */}
        <div className="bg-[#06152B] px-3.5 sm:px-6 py-2.5 sm:py-3.5 text-white flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 print:hidden flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#00C9A7]/20 text-[#00C9A7] flex items-center justify-center border border-[#00C9A7]/30 shrink-0">
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-xs sm:text-sm text-white truncate">
                Tax Invoice #{formData.invoiceNumber}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 hidden xs:block truncate">
                Trade Nexus Commercial Billing & Settlement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleToggleEdit}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
                isEditing ? 'bg-[#00C9A7] text-[#0A2540]' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{isEditing ? 'Save' : 'Edit'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 shadow-xs cursor-pointer"
              title="Print Invoice"
            >
              <Printer className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00C9A7]" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              disabled={isSendingEmail}
              onClick={handleSendEmail}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-[#00C9A7]/40 bg-[#E6FAF6] hover:bg-[#D0F7F0] font-bold text-[#00897B] text-[11px] sm:text-xs flex items-center gap-1 sm:gap-1.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
              title="Email PDF to Customer"
            >
              <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00A88B]" />
              <span className="hidden md:inline">{isSendingEmail ? 'Sending...' : 'Email'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[#00C9A7] hover:bg-[#00A88B] text-[#0A2540] text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 shadow-md shadow-[#00C9A7]/20 cursor-pointer"
            >
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>PDF</span>
            </button>

            <button
              onClick={() => setIsInvoiceModalOpen(false)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Close Preview"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div 
          ref={scrollRef} 
          className="overflow-y-auto overflow-x-hidden flex-1 p-2 sm:p-5 bg-slate-100/70 flex justify-center printable-scroll-container print:p-0 print:bg-white print:overflow-visible"
        >
          
          {/* Printable Invoice Sheet */}
          <div 
            id="printable-invoice"
            className="w-full max-w-[760px] bg-white text-slate-800 rounded-xl sm:rounded-2xl overflow-hidden relative border border-slate-200/90 font-sans shadow-sm print:shadow-none print:border-none print:m-0 print:p-0 print:rounded-none print:max-w-none flex flex-col justify-between"
            style={{ 
              minHeight: 'auto',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact'
            }}
          >
            {/* Watermark Emblem matching Reference Template */}
            <div 
              className="absolute inset-0 pointer-events-none flex items-center justify-center z-0" 
              aria-hidden="true"
              style={{ top: '160px', bottom: '100px' }}
            >
              <img 
                src={watermarkEmblem} 
                alt="" 
                className="w-56 sm:w-[300px] h-56 sm:h-[300px] object-contain opacity-[0.05] select-none" 
              />
            </div>

            {/* Top Navy/Teal Geometric Header matching 5.png */}
            <div className="relative bg-[#06152B] text-white p-4 sm:p-7 pb-6 sm:pb-8 overflow-hidden rounded-none z-10">
              {/* Decorative background polygon */}
              <div 
                className="absolute right-0 top-0 bottom-0 w-2/5 bg-gradient-to-l from-[#00C9A7]/20 to-transparent pointer-events-none" 
                style={{ clipPath: 'polygon(30% 0, 100% 0, 100% 100%, 0% 100%)' }}
              />
              <div 
                className="absolute right-0 bottom-0 h-1.5 sm:h-2 bg-[#00C9A7] w-full"
              />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-6">
                {/* Brand & Logo */}
                <div>
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <img 
                      src={logoIcon} 
                      alt="Trade Nexus" 
                      className="w-9 h-9 sm:w-11 sm:h-11 object-contain shrink-0"
                    />
                    <div>
                      <h1 className="font-display font-extrabold text-lg sm:text-xl tracking-wider text-white">TRADE NEXUS</h1>
                      <p className="text-[9px] sm:text-[10px] font-semibold text-[#00C9A7] tracking-widest uppercase">THE ONLY SMART WAY TO TRADE</p>
                    </div>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-2 sm:mt-2.5 max-w-xs leading-relaxed">
                    Trade Nexus Financial Technologies Pvt. Ltd.<br />
                    Level 12, Nexus Cyber Tower, HITEC City, Hyderabad - 500081
                  </p>
                </div>

                {/* INVOICE Title and Badge */}
                <div className="text-left sm:text-right">
                  <h2 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-white mb-1.5">
                    INVOICE
                  </h2>
                  <div className="inline-block bg-[#00C9A7]/20 border border-[#00C9A7]/50 rounded-lg px-2.5 py-0.5 text-xs font-bold text-[#00C9A7]">
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.invoiceNumber}
                        onChange={(e) => setField('invoiceNumber', e.target.value)}
                        className="bg-transparent text-[#00C9A7] font-bold w-32 outline-none"
                      />
                    ) : (
                      <>#{formData.invoiceNumber}</>
                    )}
                  </div>
                  <div className="mt-2 text-[11px] sm:text-xs text-slate-300 space-y-0.5">
                    {isEditing ? (
                      <>
                        <p className="flex items-center gap-1 sm:justify-end">
                          <span className="text-slate-400">Date:</span>
                          <input type="text" value={formData.date} onChange={(e) => setField('date', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-white w-28 text-xs" />
                        </p>
                        <p className="flex items-center gap-1 sm:justify-end">
                          <span className="text-slate-400">Due:</span>
                          <input type="text" value={formData.dueDate || ''} onChange={(e) => setField('dueDate', e.target.value)} className="bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-white w-28 text-xs" />
                        </p>
                      </>
                    ) : (
                      <>
                        <p><span className="text-slate-400">Date:</span> <span className="font-semibold text-white">{formData.date}</span></p>
                        {formData.dueDate && <p><span className="text-slate-400">Due Date:</span> <span className="font-semibold text-white">{formData.dueDate}</span></p>}
                      </>
                    )}
                    <p><span className="text-slate-400">Status:</span> <span className="font-bold text-[#00C9A7] uppercase">{formData.status}</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To / Invoice Details Section */}
            <div className="p-4 sm:p-7 pt-4 sm:pt-6 relative z-10 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6 bg-slate-50/90 p-3.5 sm:p-5 rounded-xl border border-slate-200/80 mb-4 sm:mb-6">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#00C9A7] mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    INVOICE TO (CLIENT)
                  </p>
                  {isEditing ? (
                    <div className="space-y-1.5 mt-1.5">
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{formData.clientName}</h4>
                      <p className="text-[11px] sm:text-xs font-semibold text-slate-700">{formData.clientCompany || 'Corporate Client'}</p>
                      <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed">{formData.clientAddress}</p>
                      <p className="text-[11px] sm:text-xs text-slate-500 mt-1 break-all">{formData.clientEmail} • {formData.clientPhone}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#06152B] mb-1 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#00C9A7]" />
                    PAYMENT & TAX DETAILS
                  </p>
                  <div className="text-[11px] sm:text-xs space-y-1 text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Invoice Ref:</span>
                      <span className="font-semibold text-slate-800">#{formData.invoiceNumber}</span>
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

              {/* Items Table matching Template 5 - Horizontally Scrollable on Narrow Screens */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto mb-4 sm:mb-6 shadow-2xs">
                <table className="w-full min-w-[500px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#06152B] text-white">
                      <th className="py-2.5 px-3 w-10 text-center font-bold text-[11px]">#</th>
                      <th className="py-2.5 px-3 sm:px-4 font-bold text-[11px]">ITEM DESCRIPTION</th>
                      <th className="py-2.5 px-2.5 text-center w-14 font-bold text-[11px]">QTY</th>
                      <th className="py-2.5 px-3 text-right w-24 font-bold text-[11px]">UNIT PRICE</th>
                      <th className="py-2.5 px-3 sm:px-4 text-right w-24 sm:w-28 font-bold text-[11px]">TOTAL</th>
                      {isEditing && <th className="py-2.5 px-2 w-10 text-center print:hidden">DEL</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {formData.items.map((item, idx) => (
                      <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400 text-xs">{idx + 1}</td>
                        <td className="py-2.5 px-3 sm:px-4">
                          {isEditing ? (
                            <input 
                              type="text"
                              value={item.description}
                              onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                              className="w-full p-1 border border-slate-300 rounded text-xs"
                            />
                          ) : (
                            <span className="font-semibold text-slate-800 text-xs block leading-tight">{item.description}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
                          {isEditing ? (
                            <input 
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className="w-12 p-1 border border-slate-300 rounded text-xs text-center"
                            />
                          ) : (
                            <span className="text-slate-700 font-medium text-xs">{item.quantity}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {isEditing ? (
                            <input 
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                              className="w-20 p-1 border border-slate-300 rounded text-xs text-right"
                            />
                          ) : (
                            <span className="text-slate-700 font-medium text-xs whitespace-nowrap">₹{Number(item.unitPrice).toLocaleString('en-IN')}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 sm:px-4 text-right font-bold text-[#06152B] text-xs whitespace-nowrap">
                          ₹{Number(item.total).toLocaleString('en-IN')}
                        </td>
                        {isEditing && (
                          <td className="py-2.5 px-2 text-center print:hidden">
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
                      className="px-3 py-1.5 rounded-lg bg-[#00C9A7]/20 hover:bg-[#00C9A7]/30 text-[#0A2540] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#00A88B]" />
                      <span>Add Invoice Item</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Summary & Banking info matching Template 5 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
                
                {/* Left: Payment Info and Note */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 text-xs">
                    <h5 className="font-extrabold text-[#06152B] uppercase tracking-wider text-[10px] sm:text-[11px] mb-1.5 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#00C9A7]" />
                      Payment Information
                    </h5>
                    {isEditing ? (
                      <div className="grid grid-cols-1 gap-1.5">
                        <input type="text" value={formData.bankName} onChange={(e) => setField('bankName', e.target.value)} placeholder="Bank Name" className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white" />
                        <input type="text" value={formData.accountNumber} onChange={(e) => setField('accountNumber', e.target.value)} placeholder="Account Number" className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white font-mono" />
                        <input type="text" value={formData.ifscCode || ''} onChange={(e) => setField('ifscCode', e.target.value)} placeholder="IFSC / SWIFT" className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white font-mono" />
                        <input type="text" value={formData.paymentEmail} onChange={(e) => setField('paymentEmail', e.target.value)} placeholder="Payment Email / UPI" className="w-full text-xs p-1.5 border border-slate-300 rounded bg-white" />
                      </div>
                    ) : (
                      <div className="space-y-1 text-slate-600 text-[11px] sm:text-xs">
                        <p><span className="font-semibold text-slate-800">Bank Name:</span> {formData.bankName}</p>
                        <p><span className="font-semibold text-slate-800">Account No:</span> {formData.accountNumber}</p>
                        {formData.ifscCode && <p><span className="font-semibold text-slate-800">IFSC / SWIFT:</span> {formData.ifscCode}</p>}
                        <p><span className="font-semibold text-slate-800">Payment Email:</span> {formData.paymentEmail}</p>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#00C9A7]/5 border border-[#00C9A7]/20 p-3 rounded-xl text-xs">
                    <p className="font-bold text-[#0A2540] mb-0.5 text-xs">Notes:</p>
                    {isEditing ? (
                      <textarea
                        value={formData.note || ''}
                        onChange={(e) => setField('note', e.target.value)}
                        rows={3}
                        placeholder="One note per line"
                        className="w-full text-[11px] p-1.5 border border-slate-300 rounded bg-white"
                      />
                    ) : (
                      <p className="text-slate-600 text-[11px] leading-relaxed whitespace-pre-line">
                        {formData.note || 'Payment is due within 15 days of invoice date.'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Calculations & Totals Callout */}
                <div className="space-y-2">
                  <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between py-0.5 text-slate-600 text-xs">
                      <span>Subtotal:</span>
                      <span className="font-bold text-slate-800">₹{Number(formData.subTotal).toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex justify-between py-0.5 text-slate-600 text-xs">
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

                    <div className="border-t-2 border-slate-300 pt-2 mt-1.5">
                      <div className="bg-[#06152B] text-white p-3 rounded-xl flex justify-between items-center shadow-md">
                        <span className="font-extrabold text-xs sm:text-sm uppercase tracking-wider">TOTAL DUE</span>
                        <span className="font-extrabold text-lg sm:text-xl text-[#00C9A7]">
                          ₹{Number(formData.grandTotal).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Thank You matching Template 5 (5.png) */}
                  <div className="pt-2 sm:pt-4 px-2 text-right">
                    <span 
                      className="font-serif italic font-bold text-2xl sm:text-3xl text-[#0A2540] tracking-wide block"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      Thank You!
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">We appreciate your business</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Navy Wave and Contact Footer Bar matching Template 5 */}
            <div className="mt-4 sm:mt-6 bg-[#06152B] text-white px-4 sm:px-8 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] border-t-2 border-[#00C9A7] rounded-none">
              <div className="flex items-center gap-1.5 text-slate-300 text-center sm:text-left">
                <MapPin className="w-3.5 h-3.5 text-[#00C9A7] shrink-0" />
                <span>Level 12, Nexus Cyber Tower, HITEC City, Hyderabad</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 text-slate-300">
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#00C9A7] shrink-0" />
                  <span>+91 40 4829 1000</span>
                </div>
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-[#00C9A7] shrink-0" />
                  <span>billing@tradenexus.live</span>
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="w-3 h-3 text-[#00C9A7] shrink-0" />
                  <span>www.tradenexus.live</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
