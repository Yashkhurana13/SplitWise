import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiCall } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import SettleUpModal from '../components/SettleUpModal';
import ExpenseDetailsModal from '../components/ExpenseDetailsModal';
import ImportReportModal from '../components/ImportReportModal';

const GroupDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState([]);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [importReport, setImportReport] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchGroupData = () => {
    apiCall(`/groups/${id}`).then(data => setGroup(data)).catch(()=>{});
    apiCall(`/groups/${id}/balances`).then(data => setBalances(Array.isArray(data) ? data : [])).catch(()=>{});
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('csvFile', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5001/api/import/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setImportReport(data);
      } else {
        alert(data.error || 'Import failed');
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = null; // reset input
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [id]);

  if (!group) return <div className="p-8 text-gray-500">Loading...</div>;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const safeExpenses = Array.isArray(group.expenses) ? group.expenses : [];
  const safeBalances = Array.isArray(balances) ? balances : [];

  return (
    <div className="flex h-full w-full font-sans">
      
      {/* Center Feed (Main Content) */}
      <div className="flex-1 border-r border-gray-200 bg-white">
        
        {/* Header */}
        <div className="bg-graybg px-6 py-4 flex justify-between items-center border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <img src={`https://ui-avatars.com/api/?name=${group.name}&background=fff&color=999`} className="w-12 h-12 rounded border border-gray-300 shadow-sm" alt="group icon" />
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">{group.name}</h1>
          </div>
          <div className="flex items-center space-x-3">
            <label className="cursor-pointer">
              <span className={`px-4 py-2 rounded-md font-semibold text-sm shadow-sm transition-colors ${isUploading ? 'bg-gray-300 text-gray-500' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                {isUploading ? 'Uploading...' : 'Import CSV'}
              </span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
            </label>
            <Link to={`/groups/${id}/expenses/create`}>
              <Button className="bg-debt hover:bg-debt-dark text-white font-semibold shadow-sm">Add an expense</Button>
            </Link>
            <Button onClick={() => setIsSettleModalOpen(true)} className="bg-brand hover:bg-brand-dark text-white font-semibold shadow-sm">Settle up</Button>
          </div>
        </div>

        {/* Expense Feed */}
        <div className="flex flex-col">
          {safeExpenses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <img src="https://assets.splitwise.com/assets/fat_rabbit/empty-table-light-27464010cb7c64c24ccb50a260840ff719a6200236aeeae4472f8ff160ed013b.png" alt="Empty" className="w-32 mx-auto mb-4 opacity-50" />
              <p>No expenses here yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {safeExpenses.map(exp => {
                const date = new Date(exp.createdAt);
                
                // Calculate "You borrowed / You lent"
                const isPayer = user && exp.payerId === user.id;
                let userSplit = user ? exp.splits.find(s => s.userId === user.id) : null;
                
                let balanceImpact = null;
                if (isPayer && userSplit) {
                  // You paid, but you also owe a portion. So you lent (Total - your share)
                  const lent = Number(exp.amount) - Number(userSplit.amount);
                  if (lent > 0) balanceImpact = { type: 'lent', amount: lent };
                } else if (isPayer && !userSplit) {
                  balanceImpact = { type: 'lent', amount: Number(exp.amount) };
                } else if (!isPayer && userSplit) {
                  balanceImpact = { type: 'borrowed', amount: Number(userSplit.amount) };
                }

                return (
                  <div key={exp.id} onClick={() => setSelectedExpense(exp)} className="flex items-center px-4 py-3 hover:bg-gray-50 transition cursor-pointer group">
                    {/* Date Block */}
                    <div className="flex flex-col items-center justify-center w-12 text-gray-400 group-hover:text-gray-600 transition">
                      <span className="text-[10px] uppercase font-bold tracking-widest">{monthNames[date.getMonth()]}</span>
                      <span className="text-xl font-light leading-tight">{date.getDate()}</span>
                    </div>

                    {/* Receipt Icon */}
                    <div className="w-10 h-10 bg-gray-200 rounded mx-3 flex items-center justify-center">
                      <span className="text-lg">🧾</span>
                    </div>

                    {/* Description & Payer */}
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{exp.title}</p>
                      <p className="text-xs text-gray-500 font-medium">
                        {isPayer ? 'you' : exp.payer.name} paid <span className="font-bold">${Number(exp.amount).toFixed(2)}</span>
                      </p>
                    </div>

                    {/* Balance Impact */}
                    <div className="text-right ml-4 w-32">
                      {balanceImpact ? (
                        <>
                          <p className={`text-xs font-medium ${balanceImpact.type === 'lent' ? 'text-brand' : 'text-debt'}`}>
                            {balanceImpact.type === 'lent' ? 'you lent' : 'you borrowed'}
                          </p>
                          <p className={`font-bold ${balanceImpact.type === 'lent' ? 'text-brand' : 'text-debt'}`}>
                            ${balanceImpact.amount.toFixed(2)}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400 font-medium mt-1">not involved</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar (Members & Balances) */}
      <div className="w-64 bg-graybg p-4 flex-shrink-0">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Group balances</h3>
        {safeBalances.length === 0 ? (
          <p className="text-sm text-gray-500">Everyone is settled up!</p>
        ) : (
          <ul className="space-y-4">
            {safeBalances.map((b, i) => (
              <li key={i} className="flex items-start space-x-3">
                <img src={`https://ui-avatars.com/api/?name=${b.fromUserName}&background=ddd&color=555`} className="w-8 h-8 rounded-full" />
                <div className="text-sm leading-tight">
                  <p className="font-medium text-gray-700">{b.fromUserName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">owes {b.toUserName}</p>
                  <p className="font-bold text-debt">${b.amount}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isSettleModalOpen && (
        <SettleUpModal 
          groupId={id} 
          balances={balances} 
          members={group.members}
          onClose={() => setIsSettleModalOpen(false)}
          onSettled={() => {
            setIsSettleModalOpen(false);
            fetchGroupData(); // Refresh UI
          }}
        />
      )}

      {selectedExpense && (
        <ExpenseDetailsModal 
          expense={selectedExpense} 
          onClose={() => setSelectedExpense(null)} 
        />
      )}

      {importReport && (
        <ImportReportModal 
          report={importReport}
          onClose={() => setImportReport(null)}
          onRefresh={() => {
            fetchGroupData();
          }}
        />
      )}
    </div>
  );
};

export default GroupDetails;
