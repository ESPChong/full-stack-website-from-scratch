import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'; // Gives us matchers like toBeInTheDocument
import Home from './page';

describe('Home Page', () => {
  it('renders the welcome heading', () => {
    render(<Home />); // Simulates rendering the component
    
    // Find the element by its text content
    const heading = screen.getByRole('heading', { name: /welcome to the dashboard/i });
    
    expect(heading).toBeInTheDocument();
  });
});