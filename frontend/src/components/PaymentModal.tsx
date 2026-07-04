export type ModalState = 'pending' | 'success' | 'fail' | null;

export function PaymentModal({
  state,
  message,
  onCancel,
}: {
  state: ModalState;
  message?: string;
  onCancel: () => void;
}) {
  if (!state) return null;

  const config = {
    pending: {
      icon: <div className="spinner" />,
      title: 'Check your phone',
      body: message || "We've sent an M-Pesa prompt. Enter your PIN to complete payment.",
      showCancel: true,
      cancelLabel: 'Cancel',
    },
    success: {
      icon: <div className="result-icon success">✓</div>,
      title: 'Payment received',
      body: "You're connecting now. Enjoy your browsing time!",
      showCancel: false,
      cancelLabel: 'Close',
    },
    fail: {
      icon: <div className="result-icon fail">!</div>,
      title: 'Payment not completed',
      body: message || 'The payment was cancelled or failed. Please try again.',
      showCancel: true,
      cancelLabel: 'Close',
    },
  }[state];

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-icon">{config.icon}</div>
        <h2>{config.title}</h2>
        <p className="muted">{config.body}</p>
        {config.showCancel && (
          <button className="btn ghost" onClick={onCancel}>
            {config.cancelLabel}
          </button>
        )}
      </div>
    </div>
  );
}
