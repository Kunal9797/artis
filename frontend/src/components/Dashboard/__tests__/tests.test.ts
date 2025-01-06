import { runConnectionTests } from 'utils/tests';

describe('Connection Tests', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('should handle successful connections', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => 
        Promise.resolve({
          json: () => Promise.resolve({ status: 'ok' })
        })
      )
      .mockImplementationOnce(() => 
        Promise.resolve({
          json: () => Promise.resolve({ message: 'Backend is working!' })
        })
      )
      .mockImplementationOnce(() => 
        Promise.resolve({
          json: () => Promise.resolve([])
        })
      );

    const results = await runConnectionTests();
    expect(results.backendHealth).toBe(true);
    expect(results.backendAPI).toBe(true);
    expect(results.inventoryFetch).toBe(true);
  });

  it('should handle failed health check', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => 
        Promise.resolve({
          json: () => Promise.resolve({ status: 'error' })
        })
      );

    const results = await runConnectionTests();
    expect(results.backendHealth).toBe(false);
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => Promise.reject(new Error('Network error')));

    const results = await runConnectionTests();
    expect(results.backendHealth).toBe(false);
    expect(results.backendAPI).toBe(false);
    expect(results.inventoryFetch).toBe(false);
  });

  it('should handle invalid API response', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => 
        Promise.resolve({
          json: () => Promise.resolve({ status: 'ok' })
        })
      )
      .mockImplementationOnce(() => 
        Promise.resolve({
          json: () => Promise.resolve({ message: 'Wrong message' })
        })
      );

    const results = await runConnectionTests();
    expect(results.backendHealth).toBe(true);
    expect(results.backendAPI).toBe(false);
  });
});