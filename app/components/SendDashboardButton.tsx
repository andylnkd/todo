'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Loader2, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function SendDashboardButton() {
  const [additionalEmail, setAdditionalEmail] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleSendEmail = async () => {
    startTransition(async () => {
        const emailsToSend = additionalEmail.split(/[,\s]+/).filter(email => email.trim() !== '' && /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email.trim()));

      try {
        const response = await fetch('/api/send-dashboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // Send emails only if there are any valid ones
          body: JSON.stringify({ emails: emailsToSend.length > 0 ? emailsToSend : undefined }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send email');
        }

        toast({
          title: 'Email Sent',
          description: `Dashboard sent successfully. ${data.resendId ? `(ID: ${data.resendId})` : ''}`,
        });
        setAdditionalEmail(''); // Clear input on success
      } catch (error) {
        console.error('Send email error:', error);
        toast({
          title: 'Error Sending Email',
          description: error instanceof Error ? error.message : 'An unknown error occurred',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>Email Dashboard</CardTitle>
            <CardDescription>Send a copy of your action items to yourself and optionally others.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <Label htmlFor="additional-email">Additional Emails (optional, comma-separated)</Label>
                <Input
                    id="additional-email"
                    type="text" // Changed to text to allow comma separation
                    placeholder="friend@example.com, colleague@work.com"
                    value={additionalEmail}
                    onChange={(e) => setAdditionalEmail(e.target.value)}
                    disabled={isPending}
                    className="mt-1"
                />
            </div>
            <Button onClick={handleSendEmail} disabled={isPending} className="w-full sm:w-auto">
                {isPending ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                    </>
                ) : (
                    <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Email
                    </>
                )}
            </Button>
        </CardContent>
    </Card>
  );
} 