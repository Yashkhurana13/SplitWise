import React, { useState } from 'react';
import { apiCall } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SettleUpModal = ({ groupId, balances, members, onClose, onSettled }) => {
  const { user } = useAuth();
  const [payeeId, setPayeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter balances to see who the current user owes
  const debts = balances.filter(b => b.fromUserId === user.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await apiCall(`/settlements`, {
        method: 'POST',
        body: JSON.stringify({
          groupId,
          payerId: user.id,
          payeeId,
          amount: Number(amount)
        })
      });
      onSettled();
    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Settle Up</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            
            {debts.length === 0 ? (
              <p>You don't owe anyone in this group right now!</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Who are you paying?</Label>
                  <select 
                    className="border rounded p-2 w-full" 
                    value={payeeId} 
                    onChange={e => {
                      setPayeeId(e.target.value);
                      const debt = debts.find(d => d.toUserId === e.target.value);
                      if (debt) setAmount(debt.amount);
                    }}
                    required
                  >
                    <option value="" disabled>Select a person</option>
                    {debts.map(d => (
                      <option key={d.toUserId} value={d.toUserId}>
                        {d.toUserName} (You owe ${d.amount})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    required 
                    placeholder="0.00" 
                  />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            {debts.length > 0 && (
              <Button type="submit" disabled={isSubmitting || !payeeId} className="bg-green-600 text-white">Record Payment</Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SettleUpModal;
