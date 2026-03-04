import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { inviteTrainee } from '../lib/invitationService';
import { supabase } from '../lib/supabaseClient';

interface InviteTraineeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const InviteTraineeModal: React.FC<InviteTraineeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to invite trainees');
        return;
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        setIsLoading(false);
        return;
      }

      // Invite trainee
      const result = await inviteTrainee(email, user.id);
      
      if (result.success) {
        setSuccess(true);
        setEmail('');
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
        // Auto-close after 2 seconds
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setError(result.error || 'Failed to send invitation');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setSuccess(false);
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
      onClick={handleClose}
    >
      <div
        style={{ 
          width: '90%', 
          maxWidth: '500px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >

        {success ? (
          <div style={{ textAlign: 'center', paddingTop: '16px', paddingBottom: '16px' }}>
            <div style={{ color: '#059669', marginBottom: '8px' }}>
              <svg
                style={{ margin: '0 auto', height: '48px', width: '48px' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p style={{ fontSize: '18px', fontWeight: '500', color: '#111827' }}>
              Invitation sent successfully!
            </p>
            <p style={{ fontSize: '14px', color: '#4B5563', marginTop: '8px' }}>
              An email has been sent to {email}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 
              style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#111827',
                textAlign: 'center',
                marginBottom: '8px'
              }}
            >
              Invite a Trainee
            </h2>
            <p 
              style={{ 
                fontSize: '14px', 
                color: '#374151',
                textAlign: 'center',
                marginBottom: '24px'
              }}
            >
              Trainee will receive an email with a registration link that will expire after 24 hours
            </p>

            <div style={{ marginBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
              <label
                htmlFor="email"
                style={{ 
                  display: 'block',
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="Enter trainee email address"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px', 
                backgroundColor: '#FEF2F2', 
                border: '1px solid #FECACA', 
                borderRadius: '8px',
                paddingLeft: '16px',
                paddingRight: '16px'
              }}>
                <p style={{ fontSize: '14px', color: '#DC2626' }}>{error}</p>
              </div>
            )}

            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: '12px', 
              alignItems: 'center',
              paddingLeft: '16px',
              paddingRight: '16px'
            }}>
              <button
                type="submit"
                disabled={isLoading || !email}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isLoading ? '#9CA3AF' : '#2563eb',
                  color: '#ffffff',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isLoading || !email ? 'not-allowed' : 'pointer',
                  opacity: isLoading || !email ? 0.5 : 1,
                  width: 'auto',
                  minWidth: '120px'
                }}
              >
                {isLoading ? 'Sending...' : 'Send Invitation'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#E5E7EB',
                  color: '#374151',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  width: 'auto',
                  minWidth: '120px'
                }}
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  // Render modal using React Portal to ensure it's at document body level
  return createPortal(modalContent, document.body);
};

export default InviteTraineeModal;
