export interface HotspotParams {
  mac: string | null;
  ip: string | null;
  /** URL the login form must POST username/password to (RouterOS supplies this) */
  linkLoginOnly: string | null;
  /** Where to send the browser back to after a successful login */
  linkOrig: string | null;
  error: string | null;
}

export function parseHotspotParams(search: string): HotspotParams {
  const params = new URLSearchParams(search);
  return {
    mac: params.get('mac'),
    ip: params.get('ip'),
    linkLoginOnly: params.get('link-login-only'),
    linkOrig: params.get('link-orig'),
    error: params.get('error'),
  };
}

/**
 * Submits the RADIUS username/password MikroTik's hotspot is waiting for.
 * This is a real HTML form POST (not fetch) because RouterOS's embedded
 * hotspot HTTP server expects a browser-style form submission and responds
 * with its own redirect once the RADIUS Access-Accept comes back.
 */
export function submitHotspotLogin(linkLoginOnly: string, username: string, password: string) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = linkLoginOnly;

  const addField = (name: string, value: string) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  };

  addField('username', username);
  addField('password', password);

  document.body.appendChild(form);
  form.submit();
}
