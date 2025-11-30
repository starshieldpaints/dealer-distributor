import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import styles from './VerificationBanner.module.css';

export const VerificationBanner = () => {
  const verification = useAuthStore((state) => state.verification);
  const verifyEmail = useAuthStore((state) => state.verifyEmail);
  const verifyPhone = useAuthStore((state) => state.verifyPhone);
  const resend = useAuthStore((state) => state.resendVerification);
  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!verification) return null;
  const needsEmail = verification.email !== 'verified';
  const needsPhone = verification.phone !== 'verified';
  if (!needsEmail && !needsPhone) return null;

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await verifyEmail(emailCode);
    setEmailCode('');
    setStatusMessage('Email verified');
  };

  const handlePhoneSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await verifyPhone(phoneCode);
    setPhoneCode('');
    setStatusMessage('Phone verified');
  };

  return (
    <section className={styles.banner}>
      <div>
        <h4>KYC verification pending</h4>
        <p>Complete email and phone verification to unlock all features.</p>
      </div>
      <div className={styles.actions}>
        {needsEmail && (
          <form className={styles.form} onSubmit={handleEmailSubmit}>
            <input
              type="text"
              value={emailCode}
              maxLength={6}
              onChange={(event) => setEmailCode(event.target.value)}
              placeholder="Email code"
            />
            <button type="submit" className="btn" disabled={emailCode.length < 4}>
              Verify email
            </button>
            <button type="button" className={styles.link} onClick={() => resend('email')}>
              Resend
            </button>
          </form>
        )}
        {needsPhone && (
          <form className={styles.form} onSubmit={handlePhoneSubmit}>
            <input
              type="text"
              value={phoneCode}
              maxLength={6}
              onChange={(event) => setPhoneCode(event.target.value)}
              placeholder="SMS code"
            />
            <button type="submit" className="btn" disabled={phoneCode.length < 4}>
              Verify phone
            </button>
            <button type="button" className={styles.link} onClick={() => resend('phone')}>
              Resend
            </button>
          </form>
        )}
      </div>
      {statusMessage && <p className={styles.status}>{statusMessage}</p>}
    </section>
  );
};
