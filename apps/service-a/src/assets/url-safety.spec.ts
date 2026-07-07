import { isSafeHttpUrl } from './url-safety';

describe('isSafeHttpUrl', () => {
  it('allows public http/https image hosts', () => {
    expect(isSafeHttpUrl('https://live.staticflickr.com/x/y.jpg')).toBe(true);
    expect(isSafeHttpUrl('http://images.example.com/a.png')).toBe(true);
    expect(isSafeHttpUrl('https://8.8.8.8/a.jpg')).toBe(true);
  });

  it('rejects non-http(s) schemes', () => {
    expect(isSafeHttpUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeHttpUrl('ftp://host/a')).toBe(false);
    expect(isSafeHttpUrl('data:text/plain,hi')).toBe(false);
  });

  it('rejects loopback + localhost', () => {
    expect(isSafeHttpUrl('http://localhost/a')).toBe(false);
    expect(isSafeHttpUrl('http://127.0.0.1/a')).toBe(false);
    expect(isSafeHttpUrl('http://[::1]/a')).toBe(false);
  });

  it('rejects private + link-local ranges (incl. cloud metadata)', () => {
    expect(isSafeHttpUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isSafeHttpUrl('http://10.0.0.5/a')).toBe(false);
    expect(isSafeHttpUrl('http://172.16.4.4/a')).toBe(false);
    expect(isSafeHttpUrl('http://192.168.1.1/a')).toBe(false);
    expect(isSafeHttpUrl('http://[fd00::1]/a')).toBe(false);
  });

  it('rejects garbage', () => {
    expect(isSafeHttpUrl('not a url')).toBe(false);
    expect(isSafeHttpUrl('')).toBe(false);
  });
});
