import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Receipt, 
  User, 
  Calendar, 
  Building2, 
  DollarSign, 
  Plus, 
  Trash2,
  Send,
  CreditCard
} from 'lucide-react';
import { InvoiceData, InvoiceItem } from '../../types';

interface GenerateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GenerateInvoiceModal: React.FC<GenerateInvoiceModalProps> = ({ isOpen, onClose }) => {
  const { 
    generateInvoice, 
    setSelectedInvoice, 
    setIsInvoiceModalOpen, 
    triggerToast 
  } = useApp();

  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [date, setDate] = useState('26 June 2025');
  const [dueDate, setDueDate] = useState('10 July 2025');
  const [clientName, setClientName] = useState('Estelle Darcy');
  const [clientCompany, setClientCompany] = useState('Darcy Global Trading Ltd.');
  const [clientPhone, setClientPhone] = useState('+91 98765 43210');
  const [clientEmail, setClientEmail] = useState('billing@darcytrading.com');
  const [clientAddress, setClientAddress] = useState('Plot 44, Financial District, Hyderabad - 500081');
  const [fromName, setFromName] = useState('Samira Hadid');
  const [fromRole, setFromRole] = useState('Head of Finance & Accounts');
  const [fromPhone, setFromPhone] = useState('+91 40 4829 1000');
  const [fromEmail, setFromEmail] = useState('billing@tradenexus.live');
  const [fromAddress, setFromAddress] = useState('Level 12, Nexus Cyber Tower, HITEC City, Hyderabad - 500081');
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: 'item-1', description: 'Enterprise Trading Desk Platform CRM Licensing', quantity: 1, unitPrice: 25000, total: 25000 },
    { id: 'item-2', description: 'Real-time Market Telephony & Call Analytics Setup', quantity: 1, unitPrice: 15000, total: 15000 },
    { id: 'item-3', description: 'Dedicated SDR Allocation & Technical SLA Support', quantity: 1, unitPrice: 5000, total: 5000 }
  ]);

  const [taxRate, setTaxRate] = useState(18);
  const [note, setNote] = useState('Payment is due within 15 days of invoice date. Thank you for your business!');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [accountNumber, setAccountNumber] = useState('50200084920194');
  const [ifscCode, setIfscCode] = useState('HDFC0001234');
  const [paymentEmail, setPaymentEmail] = useState('billing@tradenexus.live');

  if (!isOpen) return null;

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const it = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? Number(value) : it.quantity;
      const p = field === 'unitPrice' ? Number(value) : it.unitPrice;
      it.total = q * p;
    }
    updated[index] = it;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: `item-${Date.now()}`, description: 'Additional Corporate Service Package', quantity: 1, unitPrice: 10000, total: 10000 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      triggerToast('Invoice must have at least one line item');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const subTotal = items.reduce((acc, it) => acc + (it.total || 0), 0);
  const taxAmount = (subTotal * taxRate) / 100;
  const grandTotal = subTotal + taxAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      triggerToast('Please enter client name');
      return;
    }

    const newInvoice: Omit<InvoiceData, 'id'> = {
      invoiceNumber: invoiceNumber.trim(),
      date: date.trim(),
      dueDate: dueDate.trim(),
      clientName: clientName.trim(),
      clientCompany: clientCompany.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: clientEmail.trim(),
      clientAddress: clientAddress.trim(),
      fromName: fromName.trim(),
      fromRole: fromRole.trim(),
      fromPhone: fromPhone.trim(),
      fromEmail: fromEmail.trim(),
      fromAddress: fromAddress.trim(),
      items,
      subTotal,
      taxRate,
      taxAmount,
      grandTotal,
      note: note.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim(),
      paymentEmail: paymentEmail.trim(),
      status: 'PENDING'
    };

    generateInvoice(newInvoice);

    const fullInvoice: InvoiceData = {
      ...newInvoice,
      id: `inv-${Date.now().toString().slice(-4)}`
    };
    setSelectedInvoice(fullInvoice);
    onClose();
    setIsInvoiceModalOpen(true);
    triggerToast(`✓ Commercial Invoice #${invoiceNumber} created successfully!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-[#06152B] px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00C9A7]/20 text-[#00C9A7] flex items-center justify-center border border-[#00C9A7]/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base text-white">Create Commercial Tax Invoice</h3>
              <p className="text-[11px] text-slate-300">Template 6 (5.png) • B2B Billing & Automatic Tax Calculation</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-4 text-xs text-slate-700">
          
          {/* Invoice Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Invoice Number *</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-slate-800"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Invoice Date</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Due Date</label>
              <input
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800"
              />
            </div>
          </div>

          {/* Client Details */}
          <div>
            <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#00A88B]" />
              Client & Bill-To Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Client Contact Name *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Estelle Darcy"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Organization / Company</label>
                <input
                  type="text"
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder="e.g. Darcy Global Trading Ltd."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="billing@company.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+91 98765..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Client Address</label>
                <input
                  type="text"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  placeholder="Street, City, State, PIN"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#00A88B]" />
                Invoice Line Items
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 bg-[#00C9A7]/20 text-[#0A2540] hover:bg-[#00C9A7]/30 font-bold text-[11px] rounded-lg flex items-center gap-1 transition-all"
              >
                <Plus className="w-3 h-3 text-[#00A88B]" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/50">
              {items.map((it, idx) => (
                <div key={it.id || idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="col-span-6">
                    <input
                      type="text"
                      value={it.description}
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                      placeholder="Item Description"
                      className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-center"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={it.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      placeholder="Price"
                      className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-right font-mono"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Totals Callout */}
          <div className="bg-[#06152B] text-white p-4 rounded-2xl space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Subtotal:</span>
              <span className="font-bold text-white font-mono">₹{subTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                GST Rate (%):
                <input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-12 p-0.5 bg-slate-800 border border-slate-700 rounded text-center text-xs text-white"
                />
              </span>
              <span className="font-bold text-white font-mono">₹{taxAmount.toLocaleString('en-IN')}</span>
            </div>
            <div className="border-t border-slate-700 pt-2 flex justify-between items-center">
              <span className="font-extrabold uppercase tracking-wider text-xs">Total Amount Due:</span>
              <span className="font-black text-base text-[#00C9A7] font-mono">₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-[#00A88B]" />
              Remittance Banking Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Bank Name"
                className="p-2 bg-white border border-slate-200 rounded-xl text-xs"
              />
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="A/C Number"
                className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
              />
              <input
                type="text"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value)}
                placeholder="IFSC / SWIFT"
                className="p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#00C9A7] hover:bg-[#00B4D8] text-[#0A2540] font-black text-xs shadow-lg shadow-[#00C9A7]/25 flex items-center gap-2 transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Generate Tax Invoice</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
