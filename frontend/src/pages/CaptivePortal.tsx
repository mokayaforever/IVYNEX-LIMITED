import { useEffect, useMemo, useState } from 'react';
import { PackageCard } from '../components/PackageCard';
import { PaymentModal, type ModalState } from '../components/PaymentModal';
import { SessionRing } from '../components/SessionRing';
import { api } from '../api/client';
import { parseHotspotParams, submitHotspotLogin } from '../lib/hotspot';
import type { InitiatePaymentResponse, Package, PaymentStatusResponse, SessionCheckResponse } from '../types';

const PHONE_RE = /^0(7|1)\d{8}$/;
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 40; // ~2 minutes

export default function CaptivePortal() {
  const hotspot = useMemo(() => parseHotspotParams(window.location.search), []);

  const [packages, setPackages] = useState<Package[]>([]);
  const [selected, setSelected] = useState<Package | null>(null);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [modalMessage, setModalMessage] = useState<string | undefined>();
  const [activeExpiresAt, setActiveExpiresAt] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);

  useEffect(() => {
    api.get<Package[]>('/api/packages').then(setPackages).catch(() => {});
  }, []);

  useEffect(() => {
    const savedPhone = localStorage.getItem('ivynex_phone');
    const query = hotspot.mac
      ? `mac=${encodeURIComponent(hotspot.mac)}`
      : savedPhone
        ? `phone=${encodeURIComponent(savedPhone)}`
        : null;
    if (!query) return;

    api
      .get<SessionCheckResponse>(`/api/sessions/check?${query}`)
      .then((res) => {
        if (res.active && res.secondsRemaining) {
          setActiveExpiresAt(new Date(Date.now() + res.secondsRemaining * 1000).toISOString());
        }
      })
      .catch(() => {});
  }, [hotspot.mac]);

  function selectPackage(pkg: Package) {
    setSelected(pkg);
    setPhoneError(null);
  }

  async function handlePay() {
    if (!selected) return;
    const digits = phone.trim().replace(/\s+/g, '');
    if (!PHONE_RE.test(digits)) {
      setPhoneError('Enter a valid number, e.g. 0712 345 678');
      return;
    }

    setPaying(true);
    try {
      const res = await api.post<InitiatePaymentResponse>('/api/payments/initiate', {
        packageId: selected._id,
        phone: digits,
        macAddress: hotspot.mac,
      });
      localStorage.setItem('ivynex_phone', digits);
      setModal('pending');
      pollStatus(res.transactionId);
    } catch (err) {
      setPaying(false);
      setPhoneError(err instanceof Error ? err.message : 'Could not start payment');
    }
  }

  function pollStatus(transactionId: string) {
    let attempts = 0;
    const timer = setInterval(async () => {
      attempts++;
      try {
        const res = await api.get<PaymentStatusResponse>(`/api/payments/${transactionId}/status`);
        if (res.status === 'SUCCESS' && res.session) {
          clearInterval(timer);
          setPaying(false);
          setModal('success');

          const { radiusUsername, radiusPassword } = res.session;
          setTimeout(() => {
            setModal(null);
            if (hotspot.linkLoginOnly) {
              submitHotspotLogin(hotspot.linkLoginOnly, radiusUsername, radiusPassword);
            } else {
              // No MikroTik redirect detected (e.g. testing the portal on its
              // own) — show the credentials so they can be used manually.
              setCredentials({ username: radiusUsername, password: radiusPassword });
            }
          }, 1600);
        } else if (res.status === 'FAILED') {
          clearInterval(timer);
          setPaying(false);
          setModal('fail');
        } else if (attempts > MAX_POLL_ATTEMPTS) {
          clearInterval(timer);
          setPaying(false);
          setModalMessage('This is taking too long. Please try again.');
          setModal('fail');
        }
      } catch {
        /* keep polling silently */
      }
    }, POLL_INTERVAL_MS);
  }

  function cancelModal() {
    setPaying(false);
    setModal(null);
  }

  return (
    <>
      {activeExpiresAt ? (
        <section className="panel">
          <SessionRing expiresAt={activeExpiresAt} />
          <p className="muted center">
            You already have paid time on this connection.
            {hotspot.linkOrig && (
              <>
                {' '}
                <a href={hotspot.linkOrig} style={{ color: 'var(--teal)' }}>
                  Continue browsing
                </a>
              </>
            )}
          </p>
          <button className="btn ghost" onClick={() => setActiveExpiresAt(null)}>
            Buy more time
          </button>
        </section>
      ) : credentials ? (
        <section className="panel">
          <div className="result-icon success" style={{ marginBottom: 16 }}>✓</div>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: '0 0 8px' }}>You're all set</h2>
          <p className="muted center">
            Use these details on the WiFi login page if you're not redirected automatically:
          </p>
          <div className="purchase-card" style={{ width: '100%', marginTop: 12 }}>
            <div className="field">
              <span>Username</span>
              <input readOnly value={credentials.username} />
            </div>
            <div className="field">
              <span>Password</span>
              <input readOnly value={credentials.password} />
            </div>
          </div>
        </section>
      ) : (
        <>
          <div className="hero">
            <h1>
              Pick a package,
              <br />
              get online in seconds.
            </h1>
            <p className="muted">Pay with M-Pesa. No app, no contract — just the hours you need.</p>
          </div>

          {hotspot.error && (
            <div className="banner danger">
              Your last login attempt didn't go through. Please buy or re-enter your access details below.
            </div>
          )}

          <div className="packages">
            {packages.map((pkg, i) => (
              <PackageCard
                key={pkg._id}
                pkg={pkg}
                index={i}
                total={packages.length}
                selected={selected?._id === pkg._id}
                onSelect={() => selectPackage(pkg)}
              />
            ))}
          </div>

          {selected && (
            <div className="purchase-card">
              <div className="purchase-summary">
                <div>
                  <div className="muted small">Selected package</div>
                  <div className="selected-name">{selected.name}</div>
                </div>
                <div className="price-tag">KSh {selected.price}</div>
              </div>

              <label className="field">
                <span>M-Pesa phone number</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="07XX XXX XXX"
                  maxLength={13}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setPhoneError(null);
                  }}
                />
              </label>
              {phoneError && <div className="field-error">{phoneError}</div>}

              <button className="btn primary" disabled={paying} onClick={handlePay}>
                {paying ? 'Sending prompt…' : 'Pay with M-Pesa'}
              </button>
              <p className="muted tiny center">
                You'll get an STK push prompt on your phone — enter your M-Pesa PIN to confirm.
              </p>
            </div>
          )}
        </>
      )}

      <PaymentModal state={modal} message={modalMessage} onCancel={cancelModal} />
    </>
  );
}
