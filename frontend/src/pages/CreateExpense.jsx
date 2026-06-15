import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiCall } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CreateExpense = () => {
  const { id: groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [group, setGroup] = useState(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState(user?.id || '');
  const [splitMethod, setSplitMethod] = useState('EQUAL');
  const [splitDetails, setSplitDetails] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    apiCall(`/groups/${groupId}`).then(data => {
      setGroup(data);
      if (!payerId && data.members.length > 0) {
        setPayerId(data.members[0].userId);
      }
      // Initialize split details
      const initialSplits = {};
      data.members.forEach(m => {
        initialSplits[m.userId] = { included: true, amount: '', percentage: '', shares: '1' };
      });
      setSplitDetails(initialSplits);
    });
  }, [groupId]);

  const handleSplitChange = (userId, field, value) => {
    setSplitDetails(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value }
    }));
  };

  const calculatePreview = () => {
    if (!amount || Number(amount) <= 0) return [];
    const total = Number(amount);
    const includedIds = Object.keys(splitDetails).filter(uid => splitDetails[uid].included);
    if (includedIds.length === 0) return [];

    let splits = [];
    let calcSum = 0;

    try {
      if (splitMethod === 'EQUAL') {
        const base = Math.floor((total / includedIds.length) * 100) / 100;
        includedIds.forEach(uid => { splits.push({ userId: uid, amt: base }); calcSum += base; });
      } else if (splitMethod === 'UNEQUAL') {
        includedIds.forEach(uid => {
          const amt = Number(splitDetails[uid].amount) || 0;
          splits.push({ userId: uid, amt });
          calcSum += amt;
        });
      } else if (splitMethod === 'PERCENTAGE') {
        includedIds.forEach(uid => {
          const pct = Number(splitDetails[uid].percentage) || 0;
          const amt = Math.floor((total * (pct / 100)) * 100) / 100;
          splits.push({ userId: uid, amt });
          calcSum += amt;
        });
      } else if (splitMethod === 'SHARES') {
        let totalShares = 0;
        includedIds.forEach(uid => totalShares += (Number(splitDetails[uid].shares) || 0));
        includedIds.forEach(uid => {
          const shares = Number(splitDetails[uid].shares) || 0;
          const amt = totalShares > 0 ? Math.floor((total * (shares / totalShares)) * 100) / 100 : 0;
          splits.push({ userId: uid, amt });
          calcSum += amt;
        });
      }

      if (['EQUAL', 'PERCENTAGE', 'SHARES'].includes(splitMethod)) {
        const remainder = Math.round((total - calcSum) * 100) / 100;
        if (remainder > 0 && splits.length > 0) {
          let target = splits.find(s => s.userId === payerId) || splits[0];
          target.amt = Math.round((target.amt + remainder) * 100) / 100;
        }
      }
    } catch(e) {}
    
    return splits;
  };

  const previewSplits = calculatePreview();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const includedIds = Object.keys(splitDetails).filter(uid => splitDetails[uid].included);
    const payloadDetails = includedIds.map(uid => {
      const base = { userId: uid };
      if (splitMethod === 'UNEQUAL') base.amount = Number(splitDetails[uid].amount);
      if (splitMethod === 'PERCENTAGE') base.percentage = Number(splitDetails[uid].percentage);
      if (splitMethod === 'SHARES') base.shares = Number(splitDetails[uid].shares);
      return base;
    });

    try {
      await apiCall(`/groups/${groupId}/expenses`, {
        method: 'POST',
        body: JSON.stringify({
          title, amount: Number(amount), payerId, splitMethod, splitDetails: payloadDetails
        })
      });
      navigate(`/groups/${groupId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!group) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex justify-center">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-2xl">Add an Expense to {group.name}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Dinner at Joe's" />
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00" />
            </div>

            <div className="space-y-2">
              <Label>Paid By</Label>
              <select className="border rounded p-2 w-full" value={payerId} onChange={e => setPayerId(e.target.value)}>
                {group.members.map(m => (
                  <option key={m.userId} value={m.userId}>{m.user.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label>Split Method</Label>
              <div className="flex space-x-2">
                {['EQUAL', 'UNEQUAL', 'PERCENTAGE', 'SHARES'].map(method => (
                  <Button 
                    key={method} type="button" 
                    variant={splitMethod === method ? 'default' : 'secondary'} 
                    onClick={() => setSplitMethod(method)}
                    className={splitMethod === method ? 'bg-teal-600' : 'bg-gray-200 text-black'}
                  >
                    {method}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <Label>Split Details & Live Preview</Label>
              {group.members.map(m => {
                const uid = m.userId;
                const splitData = splitDetails[uid];
                const previewAmt = previewSplits.find(s => s.userId === uid)?.amt || 0;
                
                return (
                  <div key={uid} className="flex items-center space-x-2 justify-between p-2 bg-gray-100 rounded">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={splitData?.included || false} 
                        onChange={e => handleSplitChange(uid, 'included', e.target.checked)} 
                      />
                      <span>{m.user.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {splitMethod === 'UNEQUAL' && splitData?.included && (
                        <Input type="number" step="0.01" placeholder="$" className="w-24" value={splitData.amount} onChange={e => handleSplitChange(uid, 'amount', e.target.value)} />
                      )}
                      {splitMethod === 'PERCENTAGE' && splitData?.included && (
                        <Input type="number" step="1" placeholder="%" className="w-20" value={splitData.percentage} onChange={e => handleSplitChange(uid, 'percentage', e.target.value)} />
                      )}
                      {splitMethod === 'SHARES' && splitData?.included && (
                        <Input type="number" step="1" placeholder="Shares" className="w-20" value={splitData.shares} onChange={e => handleSplitChange(uid, 'shares', e.target.value)} />
                      )}
                      <span className="w-16 text-right font-bold">${previewAmt.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

          </CardContent>
          <CardFooter className="flex justify-between border-t p-4">
            <Button type="button" variant="secondary" onClick={() => navigate(`/groups/${groupId}`)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-teal-600 text-white">Save Expense</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CreateExpense;
