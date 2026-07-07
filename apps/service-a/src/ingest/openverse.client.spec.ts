import { BadGatewayException } from '@nestjs/common';
import { OpenverseClient } from './openverse.client';

const okResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const img = (i: number) => ({ id: `ov-${i}`, url: `u${i}`, thumbnail: `t${i}`, source: 's', license: 'by' });

describe('OpenverseClient', () => {
  let client: OpenverseClient;

  beforeEach(() => {
    client = new OpenverseClient();
    jest.spyOn(client as unknown as { backoff: () => Promise<void> }, 'backoff').mockResolvedValue();
  });

  it('requests page_size=20 (anonymous cap) with a User-Agent header', async () => {
    const fetchMock = jest.fn().mockResolvedValue(okResponse({ page_count: 1, results: [img(1)] }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await client.collect('cat', 10);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('page_size=20');
    expect((init.headers as Record<string, string>)['User-Agent']).toBeTruthy();
  });

  it('paginates until page_count is reached, respecting maxRecords', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(okResponse({ page_count: 2, results: [img(1), img(2)] }))
      .mockResolvedValueOnce(okResponse({ page_count: 2, results: [img(3), img(4)] }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { images, pages } = await client.collect('cat', 100);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(images.map((i) => i.id)).toEqual(['ov-1', 'ov-2', 'ov-3', 'ov-4']);
    expect(pages).toBe(2);
  });

  it('stops at an empty results page', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(okResponse({ page_count: 99, results: [img(1)] }))
      .mockResolvedValueOnce(okResponse({ page_count: 99, results: [] })) as unknown as typeof fetch;

    const { images } = await client.collect('cat', 100);
    expect(images).toHaveLength(1);
  });

  it('truncates to maxRecords', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(okResponse({ page_count: 1000, results: Array.from({ length: 50 }, (_, i) => img(i)) })) as unknown as typeof fetch;

    const { images } = await client.collect('cat', 30);
    expect(images).toHaveLength(30);
  });

  it('retries on 429 then succeeds', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce(okResponse({ page_count: 1, results: [img(1)] }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { images } = await client.collect('cat', 10);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(images).toHaveLength(1);
  });

  it('throws BadGateway after exhausting retries on 5xx', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;
    await expect(client.collect('cat', 10)).rejects.toBeInstanceOf(BadGatewayException);
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(3);
  });

  it('throws BadGateway when the fetch rejects (timeout)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError')) as unknown as typeof fetch;
    await expect(client.collect('cat', 10)).rejects.toBeInstanceOf(BadGatewayException);
  });
});
