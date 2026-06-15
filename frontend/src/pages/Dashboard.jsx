import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../lib/api';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const [globalBalances, setGlobalBalances] = useState([]);

  useEffect(() => {
    apiCall('/balances').then(data => setGlobalBalances(data)).catch(() => {});
  }, []);

  // Calculate totals safely
  const safeBalances = Array.isArray(globalBalances) ? globalBalances : [];
  const youOwe = user ? safeBalances.filter(b => b.fromUserId === user.id) : [];
  const youAreOwed = user ? safeBalances.filter(b => b.toUserId === user.id) : [];

  const totalOwe = youOwe.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalOwed = youAreOwed.reduce((sum, b) => sum + Number(b.amount), 0);
  const netBalance = totalOwed - totalOwe;

  return (
    <div className="flex flex-col h-full bg-white shadow-sm font-sans">
      
      {/* Header */}
      <div className="bg-graybg px-6 py-4 flex justify-between items-center border-b border-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,1)]">
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Dashboard</h1>
        <div className="flex space-x-3">
          <Button className="bg-debt hover:bg-debt-dark text-white font-semibold shadow-sm">Add an expense</Button>
          <Button className="bg-brand hover:bg-brand-dark text-white font-semibold shadow-sm">Settle up</Button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="flex border-b border-gray-200 bg-gray-50 divide-x divide-gray-200 text-center py-3">
        <div className="flex-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">total balance</p>
          <p className={`text-lg font-semibold ${netBalance > 0 ? 'text-brand' : netBalance < 0 ? 'text-debt' : 'text-gray-600'}`}>
            {netBalance > 0 ? '+' : ''}${netBalance.toFixed(2)}
          </p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">you owe</p>
          <p className={`text-lg font-semibold ${totalOwe > 0 ? 'text-debt' : 'text-gray-600'}`}>
            ${totalOwe.toFixed(2)}
          </p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">you are owed</p>
          <p className={`text-lg font-semibold ${totalOwed > 0 ? 'text-brand' : 'text-gray-600'}`}>
            ${totalOwed.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Detail Columns */}
      <div className="flex flex-1 text-sm">
        
        {/* You Owe Column */}
        <div className="flex-1 p-4 border-r border-gray-100">
          <h2 className="text-gray-500 font-semibold mb-4 uppercase text-xs tracking-wider">You owe</h2>
          {youOwe.length === 0 ? (
            <p className="text-gray-400 italic">You do not owe anything</p>
          ) : (
            <ul className="space-y-4">
              {youOwe.map(b => (
                <li key={b.toUserId} className="flex items-center space-x-3">
                  <img src={`https://ui-avatars.com/api/?name=${b.toUserName}&background=E5F3F0&color=38A081`} alt="avatar" className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="font-semibold text-gray-700">{b.toUserName}</p>
                    <p className="text-debt font-bold text-sm">you owe ${b.amount}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* You Are Owed Column */}
        <div className="flex-1 p-4">
          <h2 className="text-gray-500 font-semibold mb-4 uppercase text-xs tracking-wider">You are owed</h2>
          {youAreOwed.length === 0 ? (
            <p className="text-gray-400 italic">You are not owed anything</p>
          ) : (
            <ul className="space-y-4">
              {youAreOwed.map(b => (
                <li key={b.fromUserId} className="flex items-center space-x-3">
                  <img src={`https://ui-avatars.com/api/?name=${b.fromUserName}&background=E5F3F0&color=38A081`} alt="avatar" className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="font-semibold text-gray-700">{b.fromUserName}</p>
                    <p className="text-brand font-bold text-sm">owes you ${b.amount}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
