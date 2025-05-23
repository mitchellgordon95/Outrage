import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CreateCampaignPage from './page'; // Adjust path as necessary
import { Representative } from '@/services/representatives';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock @/utils/navigation
const mockParseDraftData = vi.fn();
const mockSaveDraftData = vi.fn();
vi.mock('@/utils/navigation', () => ({
  parseDraftData: () => mockParseDraftData(),
  saveDraftData: (data: any) => mockSaveDraftData(data),
}));

// Mock global fetch
global.fetch = vi.fn();

const mockRepresentatives: Representative[] = [
  { id: 'rep1', name: 'Rep One', contacts: [{type: 'email', value: 'rep1@example.com'}], level: 'state', office: 'Governor' },
  { id: 'rep2', name: 'Rep Two', contacts: [{type: 'email', value: 'rep2@example.com'}], level: 'state', office: 'Senator' }
];

const mockDraftData = {
  demands: ['Demand 1: Universal Basic Income'],
  representatives: mockRepresentatives,
  selectedReps: [], // This is usually an array of IDs from issue-details page, but CreateCampaignPage uses 'representatives'
};

describe('CreateCampaignPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'campaign123' }),
      })
    ) as any;

    // Set up localStorage
    localStorage.setItem('draftData', JSON.stringify(mockDraftData));
    mockParseDraftData.mockReturnValue(mockDraftData);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders with representatives and initially checked checkboxes', async () => {
    render(<CreateCampaignPage />);

    // Check for demands (to ensure component has loaded past initial checks)
    expect(screen.getByText('Demand 1: Universal Basic Income')).toBeInTheDocument();

    // Check for representatives
    expect(screen.getByText('Rep One')).toBeInTheDocument();
    expect(screen.getByLabelText('Rep One')).toBeChecked();

    expect(screen.getByText('Rep Two')).toBeInTheDocument();
    expect(screen.getByLabelText('Rep Two')).toBeChecked();
  });

  it('updates selected representatives when a checkbox is unchecked and reflects in handleSubmit', async () => {
    render(<CreateCampaignPage />);
    
    // Fill in the campaign title (required for submission)
    fireEvent.change(screen.getByLabelText(/Campaign Title/i), {
      target: { value: 'Test Campaign Title' },
    });

    // Uncheck the first representative
    const repOneCheckbox = screen.getByLabelText('Rep One');
    fireEvent.click(repOneCheckbox);
    expect(repOneCheckbox).not.toBeChecked();

    // Check that saveDraftData was called with updated representatives
    // This happens in a useEffect, so we might need to wait for it
    await waitFor(() => {
        expect(mockSaveDraftData).toHaveBeenCalled();
        const savedData = mockSaveDraftData.mock.calls[0][0];
        expect(savedData.representatives).toEqual([mockRepresentatives[1]]); // Only Rep Two
    });

    // Simulate form submission
    const createButton = screen.getByRole('button', { name: /Create Campaign/i });
    fireEvent.click(createButton);

    // Verify fetch was called with the correct payload
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Campaign Title',
          description: '', // Default description
          demands: mockDraftData.demands,
          representatives: [{ id: 'rep2', name: 'Rep Two' }], // Only Rep Two
        }),
      });
    });
  });
});
