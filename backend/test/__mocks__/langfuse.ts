// Mock implementation of Langfuse for testing
export class Langfuse {
  constructor(options?: any) {
    // Mock constructor
  }

  trace(options: any) {
    return {
      id: 'mock-trace-id',
      generation: jest.fn().mockReturnValue({
        id: 'mock-generation-id',
        end: jest.fn(),
      }),
      update: jest.fn(),
      end: jest.fn(),
    };
  }

  generation(options: any) {
    return {
      id: 'mock-generation-id',
      end: jest.fn(),
      update: jest.fn(),
    };
  }

  flushAsync() {
    return Promise.resolve();
  }

  shutdown() {
    return Promise.resolve();
  }
}

export default Langfuse;
