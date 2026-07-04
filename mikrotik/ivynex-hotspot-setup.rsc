# IVYNEX WIFI LIMITED — MikroTik RouterOS hotspot setup
#
# Paste this into New Terminal in Winbox/WebFig, or run via:
#   /import file-name=ivynex-hotspot-setup.rsc
#
# Replace every <PLACEHOLDER> before running. Assumes:
#   - hotspot clients sit on the "wifi" / "bridge-local" interface below
#   - FreeRADIUS is reachable at <RADIUS_SERVER_IP>
#   - the React captive portal is hosted at <PORTAL_URL> (e.g. the same
#     box as the backend, or a static hosting URL) — it does NOT have to
#     be on the router itself

# ---------- 1. RADIUS client: point MikroTik at FreeRADIUS ----------
/radius
add service=hotspot \
    address=<RADIUS_SERVER_IP> \
    secret=<RADIUS_SHARED_SECRET_MATCHING_clients.conf> \
    authentication-port=1812 \
    accounting-port=1813 \
    timeout=3s

# Tell the hotspot to actually use RADIUS instead of the local user DB,
# and to send interim accounting updates so the backend's Session doc
# stays fresh (bandwidth counters, last-seen time).
/ip hotspot profile
set [find name=hsprof1] \
    use-radius=yes \
    radius-accounting=yes \
    radius-interim-update=1m \
    login-by=http-pap

# ---------- 2. Hotspot server on your WiFi/LAN interface ----------
# Adjust <HOTSPOT_INTERFACE> to whatever bridge/interface your WiFi clients
# land on (commonly "bridge" if AP + LAN share one bridge).
/ip hotspot
add name=ivynex-hotspot interface=<HOTSPOT_INTERFACE> \
    address-pool=ivynex-pool \
    profile=hsprof1 \
    disabled=no

/ip pool
add name=ivynex-pool ranges=10.5.50.10-10.5.50.250

/ip address
add address=10.5.50.1/24 interface=<HOTSPOT_INTERFACE>

# ---------- 3. Point the hotspot at the external captive portal ----------
# RouterOS's hotspot normally serves its own built-in login.html. Instead,
# we redirect first-time users straight to the React app, passing along
# the mac/ip/link-login-only params it needs (RouterOS fills these in
# automatically via the $(...) variables below).
/ip hotspot walled-garden
add dst-host=<PORTAL_DOMAIN_OR_IP> action=allow comment="IVYNEX captive portal itself"
add dst-host=api.ivynexwifi.co.ke action=allow comment="IVYNEX backend API (M-Pesa init/status)"
add dst-host="*.safaricom.co.ke" action=allow comment="in case a client resource ever needs it"

/ip hotspot profile
set [find name=hsprof1] \
    html-directory=hotspot \
    login-by=http-pap

# The actual "send users to our external page" step: edit
# hotspot/login.html on the router to be a 1-line redirect instead of
# RouterOS's default form. Simplest approach — replace its contents with:
#
#   <html><head><meta http-equiv="refresh" content="0; url=https://<PORTAL_DOMAIN>/?mac=$(mac)&ip=$(ip)&link-login-only=$(link-login-only)&link-orig=$(link-orig)&error=$(error)"></head></html>
#
# Upload that as /hotspot/login.html via Files in Winbox (or FTP), replacing
# the stock one for the "hotspot" profile referenced above.

# ---------- 4. Optional: RADIUS-based disconnect (CoA) ----------
# Not required — Session-Timeout (set by FreeRADIUS from the backend's
# remaining-seconds calculation) already makes MikroTik disconnect the
# user automatically once their paid time is up. Configure this only if
# you want to force-disconnect someone before their timeout (e.g. a manual
# "kick" button in the admin dashboard) using RouterOS's API from the
# backend (MIKROTIK_HOST / MIKROTIK_API_PORT in backend/.env.example).

:log info "IVYNEX WIFI hotspot configuration applied. Verify with /ip hotspot print and /radius print."
