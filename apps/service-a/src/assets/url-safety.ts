export function isSafeHttpUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;

  let host = u.hostname.toLowerCase();
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
  if (host === 'localhost' || host.endsWith('.localhost')) return false;

  const v4 = parseIpv4(host);
  if (v4) return !isPrivateIpv4(v4);

  if (host.includes(':')) return !isPrivateIpv6(host);

  return true;
}

function parseIpv4(host: string): [number, number, number, number] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return null;
  const octets = m.slice(1, 5).map(Number) as [number, number, number, number];
  return octets.every((o) => o >= 0 && o <= 255) ? octets : null;
}

function isPrivateIpv4([a, b]: [number, number, number, number]): boolean {
  if (a === 0 || a === 127) return true;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIpv6(host: string): boolean {
  if (host === '::1' || host === '::') return true;
  if (host.startsWith('fc') || host.startsWith('fd')) return true;
  if (host.startsWith('fe80')) return true;
  const mapped = /::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i.exec(host);
  if (mapped) {
    const v4 = parseIpv4(mapped[1]);
    return v4 ? isPrivateIpv4(v4) : true;
  }
  return false;
}
