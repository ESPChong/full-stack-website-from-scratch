import { render, screen, waitFor } from '@testing-library/react';
import Home from './page';

// Mock fetch before any tests run
beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ message: 'Backend is successfully connected!' }),
    })
  ) as jest.Mock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Home Page', () => {
  it('renders the connection test heading', async () => {
    render(<Home />);
    const heading = screen.getByRole('heading', {
      name: /MERN Stack Connection Test/i 
    });
    expect(heading).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Backend is successfully connected!/i)).toBeInTheDocument();
    });
  });
});