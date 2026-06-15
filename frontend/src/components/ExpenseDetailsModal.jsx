import React, { useEffect, useState, useRef } from 'react';
import { apiCall } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ExpenseDetailsModal = ({ expense, onClose }) => {
  const { user } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Fetch historical messages
    apiCall(`/expenses/${expense.id}/messages`).then(data => setMessages(data)).catch(()=>{});

    // Connect socket
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || window.location.origin);
    socketRef.current.emit('join-expense', expense.id);

    socketRef.current.on('message-received', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [expense.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    socketRef.current.emit('send-message', {
      expenseId: expense.id,
      userId: user.id,
      content: newMessage
    });
    setNewMessage('');
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const date = new Date(expense.createdAt);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 font-sans backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-graybg px-6 py-4 flex justify-between items-start border-b border-gray-200">
          <div className="flex space-x-4">
            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center border border-gray-300">
              <span className="text-2xl">🧾</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 leading-tight">{expense.title}</h2>
              <p className="text-2xl font-bold text-gray-800 mt-1">${Number(expense.amount).toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Added by {expense.payer.name} on {monthNames[date.getMonth()]} {date.getDate()}, {date.getFullYear()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>

        {/* Split Breakdown */}
        <div className="p-6 border-b border-gray-100 bg-white">
          <ul className="space-y-3">
            {expense.splits.map(split => (
              <li key={split.id} className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-brand">✓</span>
                  <img src={`https://ui-avatars.com/api/?name=${split.user.name}&background=E5F3F0&color=38A081`} className="w-6 h-6 rounded-full" />
                  <span className="font-medium text-gray-700">{split.user.name}</span>
                </div>
                <span className="font-bold text-gray-800">${Number(split.amount).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Chat / Comments */}
        <div className="flex-1 bg-graybg flex flex-col min-h-[250px]">
          <div className="px-6 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Notes and Comments
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
            {messages.length === 0 && <p className="text-sm text-gray-400 italic">No comments yet.</p>}
            {messages.map((msg, i) => {
              const isMe = msg.userId === user?.id;
              return (
                <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm ${isMe ? 'bg-brand text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                    {!isMe && <p className="text-xs font-bold mb-0.5 text-gray-500">{msg.user?.name || 'User'}</p>}
                    <p>{msg.content}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 bg-white border-t border-gray-200">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <Input 
                value={newMessage} 
                onChange={e => setNewMessage(e.target.value)} 
                placeholder="Add a comment" 
                className="flex-1 bg-graybg border-gray-300"
              />
              <Button type="submit" className="bg-brand hover:bg-brand-dark text-white shadow-sm font-semibold px-6">Post</Button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExpenseDetailsModal;
