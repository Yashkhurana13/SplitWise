import React, { useState } from 'react';
import { apiCall } from '../lib/api';
import { Button } from '@/components/ui/button';

const ImportReportModal = ({ report, onClose, onRefresh }) => {
  const [anomalies, setAnomalies] = useState(report.anomaliesDetails || []);
  const [pendingCount, setPendingCount] = useState(report.pendingRows);

  const handleAction = async (expenseId, action) => {
    try {
      await apiCall(`/approval/expenses/${expenseId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      // Optimistically remove from list
      setAnomalies(prev => prev.filter(a => a.expenseId !== expenseId));
      setPendingCount(prev => prev - 1);
      onRefresh(); // Trigger parent refresh in background
    } catch (err) {
      console.error('Failed to resolve anomaly', err);
      alert('Failed to execute action.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 font-sans backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-graybg px-6 py-4 flex justify-between items-start border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800 leading-tight">Import Report</h2>
            <p className="text-sm text-gray-500 mt-1">File: {report.fileName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>

        {/* Summary Stats */}
        <div className="flex border-b border-gray-100 bg-white p-6 space-x-8">
          <div>
            <p className="text-xs text-gray-500 uppercase">Total Rows</p>
            <p className="text-2xl font-bold">{report.totalRows}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Pending</p>
            <p className="text-2xl font-bold text-debt">{pendingCount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Anomalies Detected</p>
            <p className="text-2xl font-bold text-brand">{anomalies.length}</p>
          </div>
        </div>

        {/* Anomaly Resolution Queue */}
        <div className="flex-1 overflow-y-auto bg-graybg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Anomaly Resolution Queue</h3>
          
          {anomalies.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-lg border border-gray-200">
              <span className="text-4xl">🎉</span>
              <p className="mt-4 text-gray-600 font-medium">All anomalies resolved!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {anomalies.map((anomaly, idx) => (
                <div key={idx} className="bg-white rounded-lg border border-red-200 shadow-sm overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-red-600 uppercase tracking-wider">{anomaly.type}</span>
                    <span className="text-xs text-red-500 font-medium">{anomaly.severity} Priority</span>
                  </div>
                  <div className="p-4 flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 font-medium">{anomaly.description}</p>
                      <p className="text-xs text-gray-500 mt-2">Expense ID: {anomaly.expenseId}</p>
                    </div>
                    <div className="flex flex-col space-y-2 min-w-[120px]">
                      {anomaly.type === 'SETTLEMENT' ? (
                        <Button size="sm" className="bg-brand text-white" onClick={() => handleAction(anomaly.expenseId, 'CONVERT_TO_SETTLEMENT')}>
                          Convert to Settlement
                        </Button>
                      ) : null}
                      <Button size="sm" className="bg-brand hover:bg-brand-dark text-white" onClick={() => handleAction(anomaly.expenseId, 'APPROVE')}>
                        Approve Anyway
                      </Button>
                      <Button size="sm" variant="destructive" className="bg-debt hover:bg-debt-dark text-white" onClick={() => handleAction(anomaly.expenseId, 'REJECT')}>
                        Reject & Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ImportReportModal;
