import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import type { RegisterPayload } from '../../api/auth';
import { searchPincodes, type Pincode } from '../../api/pincodes';
import { readFileAsDataUrl } from '../../utils/file';
import { FaceCapture } from '../../components/kyc/FaceCapture';
import styles from './RegisterPage.module.css';

type Step = 'account' | 'identity' | 'bank' | 'face';

interface AccountValues {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: 'distributor' | 'dealer' | 'field_rep';
  distributorId?: string;
}

interface IdentityValues {
  aadhaarNumber: string;
  panNumber: string;
}

interface BankValues {
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  upiId?: string;
}

const steps: Step[] = ['account', 'identity', 'bank', 'face'];

const StepIndicator = ({ current }: { current: Step }) => (
  <ol className={styles.steps}>
    {steps.map((step) => (
      <li key={step} className={clsx(styles.step, current === step && styles.active)}>
        <span>{step === 'account' && 'Account'}</span>
        <span>{step === 'identity' && 'Identity'}</span>
        <span>{step === 'bank' && 'Bank & UPI'}</span>
        <span>{step === 'face' && 'Live Photo'}</span>
      </li>
    ))}
  </ol>
);

interface Props {
  allowedRoles?: Array<'distributor' | 'dealer' | 'field_rep'>;
  presetDistributorId?: string | null;
  presetParentUserId?: string | null;
  hideLoginLink?: boolean;
  onSubmit: (payload: RegisterPayload) => Promise<void>;
}

export const OnboardingWizard = ({
  allowedRoles = ['distributor', 'dealer'],
  presetDistributorId,
  presetParentUserId,
  hideLoginLink,
  onSubmit
}: Props) => {
  const [step, setStep] = useState<Step>('account');
  const [formState, setFormState] = useState<Partial<RegisterPayload>>({
    role: allowedRoles[0] ?? 'distributor',
    distributorId: presetDistributorId ?? undefined,
    parentUserId: presetParentUserId ?? undefined
  });
  const [aadhaarImage, setAadhaarImage] = useState<string | null>(null);
  const [panImage, setPanImage] = useState<string | null>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [pinQuery, setPinQuery] = useState('');
  const [selectedPins, setSelectedPins] = useState<string[]>(formState.pinCodes ?? []);
  const pinResults = useQuery({
    queryKey: ['pinSearch', pinQuery],
    queryFn: () => searchPincodes(pinQuery),
    enabled: pinQuery.trim().length >= 3
  });

  const accountForm = useForm<AccountValues>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: allowedRoles[0] ?? 'distributor',
      distributorId: presetDistributorId ?? undefined
    }
  });
  const { errors: accountErrors } = accountForm.formState;

  const identityForm = useForm<IdentityValues>({
    defaultValues: {
      aadhaarNumber: '',
      panNumber: ''
    }
  });

  const bankForm = useForm<BankValues>({
    defaultValues: {
      bankAccountName: '',
      bankAccountNumber: '',
      bankIfsc: '',
      upiId: ''
    }
  });
  const { errors: bankErrors } = bankForm.formState;

  const availablePins = useMemo<Pincode[]>(() => {
    return pinResults.data ?? [];
  }, [pinResults.data]);

  const handleAccountNext = accountForm.handleSubmit((values) => {
    if (values.password !== values.confirmPassword) {
      accountForm.setError('confirmPassword', {
        type: 'validate',
        message: 'Passwords must match'
      });
      return;
    }
    setFormState((prev) => ({
      ...prev,
      name: values.name,
      email: values.email,
      phone: values.phone,
      password: values.password,
      role: values.role,
      distributorId: presetDistributorId ?? values.distributorId,
      pinCodes: selectedPins
    }));
    if (selectedPins.length === 0) {
      setGlobalError('Select at least one PIN code');
    } else {
      setGlobalError(null);
      setStep('identity');
    }
  });

  const handleIdentityNext = identityForm.handleSubmit(async (values) => {
    if (!aadhaarImage || !panImage) {
      identityForm.setError('aadhaarNumber', {
        type: 'validate',
        message: 'Upload Aadhaar and PAN scans to continue'
      });
      return;
    }
    setFormState((prev) => ({
      ...prev,
      aadhaarNumber: values.aadhaarNumber,
      panNumber: values.panNumber,
      aadhaarImage,
      panImage
    }));
    setStep('bank');
  });

  const handleBankNext = bankForm.handleSubmit((values) => {
    setFormState((prev) => ({
      ...prev,
      bankAccountName: values.bankAccountName,
      bankAccountNumber: values.bankAccountNumber,
      bankIfsc: values.bankIfsc,
      upiId: values.upiId
    }));
    setStep('face');
  });

  const submitWizard = async () => {
    if (!faceImage) return;
    const payload: RegisterPayload = {
      name: formState.name ?? '',
      email: formState.email ?? '',
      phone: formState.phone ?? '',
      password: formState.password ?? '',
      role: (formState.role as RegisterPayload['role']) ?? 'distributor',
      distributorId: formState.distributorId,
      parentUserId: presetParentUserId ?? formState.parentUserId,
      aadhaarNumber: formState.aadhaarNumber ?? '',
      aadhaarImage: formState.aadhaarImage ?? '',
      panNumber: formState.panNumber ?? '',
      panImage: formState.panImage ?? '',
      faceImage,
      pinCodes: selectedPins,
      bankAccountNumber: formState.bankAccountNumber,
      bankIfsc: formState.bankIfsc,
      bankAccountName: formState.bankAccountName,
      upiId: formState.upiId
    };
    try {
      setLoading(true);
      setGlobalError(null);
      await onSubmit(payload);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string | null) => void
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setter(dataUrl);
  };

  return (
    <div className={styles.container}>
      <StepIndicator current={step} />
      {step === 'account' && (
        <form className={styles.form} onSubmit={handleAccountNext}>
          <label>
            Full name
            <input {...accountForm.register('name', { required: true })} placeholder="Ravi Kumar" />
          </label>
          <label>
            Work email
            <input type="email" {...accountForm.register('email', { required: true })} placeholder="sales@distributor.com" />
          </label>
          <label>
            Phone number
            <input
              type="tel"
              {...accountForm.register('phone', {
                required: 'Phone is required',
                pattern: {
                  value: /^\+?[1-9]\d{9,14}$/,
                  message: 'Use E.164 format, e.g. +919800000123'
                }
              })}
              placeholder="+919800000123"
            />
            {accountErrors.phone && <p className={styles.error}>{accountErrors.phone.message}</p>}
          </label>
          <label>
            Password
            <input
              type="password"
              {...accountForm.register('password', {
                required: 'Password is required',
                minLength: { value: 10, message: 'Password must be at least 10 characters long' }
              })}
              placeholder="Minimum 10 characters"
            />
            {accountErrors.password && (
              <p className={styles.error}>{accountErrors.password.message}</p>
            )}
          </label>
          <label>
            Confirm password
            <input
              type="password"
              {...accountForm.register('confirmPassword', { required: true })}
              placeholder="Repeat password"
            />
            {accountErrors.confirmPassword && (
              <p className={styles.error}>{accountErrors.confirmPassword.message}</p>
            )}
          </label>
          <label>
            Role
            <select {...accountForm.register('role', { required: true })}>
              {allowedRoles.map((role) => (
                <option key={role} value={role}>
                  {role === 'distributor' && 'Distributor'}
                  {role === 'dealer' && 'Dealer'}
                  {role === 'field_rep' && 'Field Rep'}
                </option>
              ))}
            </select>
          </label>
          {(accountForm.watch('role') === 'dealer' || accountForm.watch('role') === 'field_rep') &&
            !presetDistributorId && (
              <label>
                Distributor ID
                <input {...accountForm.register('distributorId', { required: true })} placeholder="Distributor UUID" />
              </label>
            )}
          <div className={styles.pinSection}>
            <label>Service PIN codes</label>
            <div className={styles.pinControls}>
              <input
                type="text"
                placeholder="Search PIN or city"
                value={pinQuery}
                onChange={(event) => setPinQuery(event.target.value)}
              />
              {pinQuery.length >= 3 && (
                <div className={styles.pinSuggestions}>
                  {pinResults.isLoading && <p>Searching…</p>}
                  {availablePins.map((pin) => (
                    <button
                      type="button"
                      key={pin.code}
                      onClick={() => {
                        if (!selectedPins.includes(pin.code)) {
                          setSelectedPins((prev) => [...prev, pin.code]);
                        }
                        setPinQuery('');
                      }}
                    >
                      {pin.code} · {pin.officeName ?? pin.districtName ?? pin.stateName}
                    </button>
                  ))}
                  {!pinResults.isLoading && availablePins.length === 0 && (
                    <p>No matches found</p>
                  )}
                </div>
              )}
            </div>
            {selectedPins.length > 0 && (
              <div className={styles.pinChips}>
                {selectedPins.map((pin) => (
                  <span key={pin}>
                    {pin}
                    <button
                      type="button"
                      aria-label={`Remove ${pin}`}
                      onClick={() =>
                        setSelectedPins((prev) => prev.filter((code) => code !== pin))
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {globalError && <p className={styles.error}>{globalError}</p>}
          <button type="submit" className="btn">
            Next
          </button>
          {!hideLoginLink && (
            <p className={styles.hint}>
              Already registered?{' '}
              <Link to="/login" className={styles.link}>
                Sign in
              </Link>
            </p>
          )}
        </form>
      )}
      {step === 'identity' && (
        <form className={styles.form} onSubmit={handleIdentityNext}>
          <label>
            Aadhaar number
            <input
              {...identityForm.register('aadhaarNumber', { required: true })}
              placeholder="1234 5678 9012"
            />
          </label>
          <label>
            PAN number
            <input {...identityForm.register('panNumber', { required: true })} placeholder="ABCDE1234F" />
          </label>
          <label>
            Upload Aadhaar scan
            <input type="file" accept="image/*" onChange={(event) => handleFileChange(event, setAadhaarImage)} />
          </label>
          <label>
            Upload PAN scan
            <input type="file" accept="image/*" onChange={(event) => handleFileChange(event, setPanImage)} />
          </label>
          <div className={styles.stepActions}>
            <button type="button" className={styles.ghostButton} onClick={() => setStep('account')}>
              Back
            </button>
            <button type="submit" className="btn">
              Next
            </button>
          </div>
        </form>
      )}
      {step === 'bank' && (
        <form className={styles.form} onSubmit={handleBankNext}>
          <label>
            Account holder name
            <input {...bankForm.register('bankAccountName')} placeholder="Same as bank record" />
          </label>
          <label>
            Account number
            <input {...bankForm.register('bankAccountNumber')} placeholder="XXXXXXXXXXXX" />
          </label>
          <label>
            IFSC
            <input
              {...bankForm.register('bankIfsc', {
                maxLength: { value: 11, message: 'IFSC must be at most 11 characters' }
              })}
              placeholder="HDFC0123456"
            />
            {bankErrors.bankIfsc && <p className={styles.error}>{bankErrors.bankIfsc.message}</p>}
          </label>
          <label>
            UPI ID (optional)
            <input
              {...bankForm.register('upiId', {
                pattern: { value: /^[-\w.]+@[-\w.]+$/, message: 'UPI ID must follow handle@bank' }
              })}
              placeholder="demo@icici"
            />
            {bankErrors.upiId && <p className={styles.error}>{bankErrors.upiId.message}</p>}
          </label>
          <div className={styles.stepActions}>
            <button type="button" className={styles.ghostButton} onClick={() => setStep('identity')}>
              Back
            </button>
            <button type="submit" className="btn">
              Next
            </button>
          </div>
        </form>
      )}
      {step === 'face' && (
        <div className={styles.faceStep}>
          <FaceCapture onCapture={(dataUrl) => setFaceImage(dataUrl)} />
          <div className={styles.stepActions}>
            <button type="button" className={styles.ghostButton} onClick={() => setStep('bank')}>
              Back
            </button>
            <button type="button" className="btn" disabled={!faceImage || loading} onClick={submitWizard}>
              {loading ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
