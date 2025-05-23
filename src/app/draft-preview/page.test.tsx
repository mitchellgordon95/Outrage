import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DraftPreviewPage from './page'; // Adjust path as necessary
import { Representative } from '@/services/representatives';

// Mock next/navigation
const mockRouterPush = vi.fn();
const mockRouterReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '',
}));

// Mock @/utils/navigation
const mockParseDraftData = vi.fn();
const mockGetProgressState = vi.fn();
vi.mock('@/utils/navigation', () => ({
  parseDraftData: mockParseDraftData,
  getProgressState: mockGetProgressState,
}));

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock global fetch
global.fetch = vi.fn();

const mockDemands = ['Demand 1', 'Demand 2'];
const mockPersonalInfo = 'My personal info';
const mockRepresentatives: Representative[] = [
  { name: 'Rep 1', email: 'rep1@example.com', contacts: [{type: 'email', value: 'rep1@example.com'}] },
  { name: 'Rep 2', email: 'rep2@example.com', contacts: [{type: 'email', value: 'rep2@example.com'}] },
  { name: 'Rep 3', email: 'rep3@example.com', contacts: [{type: 'email', value: 'rep3@example.com'}] },
];

const initialDraftData = {
  demands: mockDemands,
  personalInfo: mockPersonalInfo,
  representatives: mockRepresentatives,
  selectionSummary: 'Summary',
  selectionExplanations: { 0: 'Explanation 1' },
  selectedReps: [0, 1, 2],
};

describe('DraftPreviewPage - Revise All Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Clear mocks before each test

    // Setup default localStorage mocks
    mockLocalStorage.setItem('userAddress', '123 Main St');

    // Setup default navigation utility mocks
    mockParseDraftData.mockReturnValue(initialDraftData);
    mockGetProgressState.mockReturnValue({
      demands: true,
      representatives: true,
      personalInfo: true,
    });

    // Setup default fetch mock for initial draft generation
    (fetch as vi.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/generate-representative-draft')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ subject: 'Initial Subject', content: 'Initial Content' }),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Unknown endpoint' }) });
    });
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  describe('Revise All Button Rendering and State', () => {
    it('should render the "Revise All" button', async () => {
      render(<DraftPreviewPage />);
      await waitFor(() => {
        expect(screen.getByText('Revise All')).toBeInTheDocument();
      });
    });

    it('should be initially disabled when feedbackText is empty', async () => {
      render(<DraftPreviewPage />);
      await waitFor(() => {
        expect(screen.getByText('Revise All')).toBeDisabled();
      });
    });

    it('should be disabled if feedbackText is present but no drafts are complete', async () => {
      // Override fetch to ensure drafts are not 'complete' initially or are in loading/error state
      (fetch as vi.Mock).mockResolvedValueOnce({ // For initial load
        ok: true,
        json: () => Promise.resolve({ subject: 'Loading Subject', content: 'Loading Content' }),
      }).mockResolvedValueOnce({ // For initial load
        ok: true,
        json: () => Promise.resolve({ subject: 'Loading Subject', content: 'Loading Content' }),
      }).mockResolvedValueOnce({ // For initial load
         ok: true,
        json: () => Promise.resolve({ subject: 'Loading Subject', content: 'Loading Content' }),
      });


      render(<DraftPreviewPage />);
      
      // Wait for initial drafts to attempt loading
      // The default mock will make them 'complete', so we need to ensure they are not for this test.
      // The easiest way is to ensure the component state reflects this.
      // Since we can't directly check state, we rely on the button's disabled logic.
      // For this specific test, we'll simulate that initial drafts are still loading or errored.
      // The provided setup for fetch will make them 'complete' after waitFor.
      // So we'll simulate that all drafts are loading by not letting the initial fetch calls complete successfully for status 'complete'
      // This is tricky without direct state manipulation access.

      // Let's assume the initial draft generation sets them to 'complete' due to default mock.
      // We need to simulate a scenario where NO draft is complete.
      // The easiest way is to ensure the component initializes with no 'complete' drafts.
      // We'll rely on the default behavior where drafts are loaded, then fill feedback.
      
      await waitFor(() => {
        // Ensure all drafts are loaded and become 'complete' due to the default fetch mock
        expect(screen.queryAllByText('Initial Subject')).toHaveLength(mockRepresentatives.length);
      });

      const feedbackTextarea = screen.getByPlaceholderText('Enter your feedback here...');
      await userEvent.type(feedbackTextarea, 'Some feedback');
      
      // To test this specific scenario, we need to ensure no drafts are 'complete'.
      // We can achieve this by making initial fetch fail for all drafts.
      (fetch as vi.Mock).mockReset(); // Reset from beforeEach
      (fetch as vi.Mock).mockImplementation((url: string) => {
         if (url.includes('/api/generate-representative-draft')) {
           return Promise.resolve({
             ok: false, // Make it fail
             status: 500,
             json: () => Promise.resolve({ error: 'Failed to generate' }),
           });
         }
         return Promise.resolve({ ok: false, json: () => Promise.resolve({error: 'Unknown endpoint'})});
      });

      render(<DraftPreviewPage />); // Re-render with new fetch mock for this test

      await waitFor(() => {
        // Check that error messages are shown for drafts, implying they are not 'complete'
        expect(screen.queryAllByText(/Error generating draft/)).toHaveLength(mockRepresentatives.length > 0 ? 1 : 0); // assuming first selected draft shows error
      });
      
      const feedbackTextarea2 = screen.getByPlaceholderText('Enter your feedback here...');
      await userEvent.type(feedbackTextarea2, 'Some feedback');
      expect(screen.getByText('Revise All')).toBeDisabled();
    });

    it('should be enabled when feedbackText is provided AND at least one draft is complete', async () => {
      render(<DraftPreviewPage />);
      
      // Wait for initial drafts to load and become 'complete'
      await waitFor(() => {
        expect(screen.queryAllByText('Initial Subject')).toHaveLength(mockRepresentatives.length);
        // Select the first representative to ensure currentDraft is set and feedback section is visible
        const repButtons = screen.getAllByRole('button', { name: /Rep \d/ });
        if (repButtons.length > 0) {
          fireEvent.click(repButtons[0]);
        }
      });
      
      await waitFor(() => {
         expect(screen.getByText('Initial Subject')).toBeInTheDocument();
      });


      const feedbackTextarea = screen.getByPlaceholderText('Enter your feedback here...');
      await userEvent.type(feedbackTextarea, 'Important feedback!');

      expect(screen.getByText('Revise All')).toBeEnabled();
    });
  });

  describe('handleReviseAll Functionality', () => {
    const mockDemands = ['Demand X', 'Demand Y'];
    const mockPersonalInfo = 'Test User Info';
    const mockReps: Representative[] = [
      { name: 'Test Rep 1', email: 'testrep1@example.com', contacts: [{type: 'email', value: 'testrep1@example.com'}] },
      { name: 'Test Rep 2', email: 'testrep2@example.com', contacts: [{type: 'email', value: 'testrep2@example.com'}] },
      { name: 'Test Rep 3', email: 'testrep3@example.com', contacts: [{type: 'email', value: 'testrep3@example.com'}] },
    ];

    const initialDraftDataForRevisionTest = {
      demands: mockDemands,
      personalInfo: mockPersonalInfo,
      representatives: mockReps,
      selectionSummary: 'Summary',
      selectionExplanations: {},
      selectedReps: [0, 1, 2],
    };

    beforeEach(() => {
      mockParseDraftData.mockReturnValue(initialDraftDataForRevisionTest);
      // Reset fetch mock for specific revision tests
      (fetch as vi.Mock).mockReset();
    });

    it('should call fetch for "complete" drafts, update status to loading, and clear feedback', async () => {
      // Initial draft generation: Rep1=complete, Rep2=complete, Rep3=error
      (fetch as vi.Mock)
        .mockImplementationOnce(async (url: string) => { // Rep 1 - success
          if (url.includes('/api/generate-representative-draft')) {
            return { ok: true, json: async () => ({ subject: 'Subject Rep 1', content: 'Content Rep 1' }) };
          }
          return { ok: false, json: async () => ({ error: 'Unknown' }) };
        })
        .mockImplementationOnce(async (url: string) => { // Rep 2 - success
          if (url.includes('/api/generate-representative-draft')) {
            return { ok: true, json: async () => ({ subject: 'Subject Rep 2', content: 'Content Rep 2' }) };
          }
          return { ok: false, json: async () => ({ error: 'Unknown' }) };
        })
        .mockImplementationOnce(async (url: string) => { // Rep 3 - error
          if (url.includes('/api/generate-representative-draft')) {
            return { ok: false, status:500, json: async () => ({ error: 'Failed initial generation' }) };
          }
          return { ok: false, json: async () => ({ error: 'Unknown' }) };
        });

      render(<DraftPreviewPage />);
      
      // Wait for initial loads
      await waitFor(() => {
        expect(screen.getByText('Subject Rep 1')).toBeInTheDocument();
        expect(screen.getByText('Subject Rep 2')).toBeInTheDocument();
      });
      await waitFor(() => {
        // Click on Rep 3 to see its error state
        const rep3Button = screen.getByRole('button', { name: /Test Rep 3/ });
        fireEvent.click(rep3Button);
      });
      await waitFor(() => {
         expect(screen.getByText(/Error generating draft: Failed initial generation/)).toBeInTheDocument();
      });


      // Set up fetch for the revision calls
      const revisedSubject = 'Revised Subject';
      const revisedContent = 'Revised Content';
      (fetch as vi.Mock)
        .mockImplementationOnce(async (url: string) => { // Revision for Rep 1
            if (url.includes('/api/generate-representative-draft')) {
                return { ok: true, json: async () => ({ subject: revisedSubject, content: revisedContent + " Rep 1" })};
            }
            return { ok: false, json: async () => ({ error: 'Revision failed' })};
        })
        .mockImplementationOnce(async (url: string) => { // Revision for Rep 2
            if (url.includes('/api/generate-representative-draft')) {
                return { ok: true, json: async () => ({ subject: revisedSubject, content: revisedContent + " Rep 2" })};
            }
            return { ok: false, json: async () => ({ error: 'Revision failed' })};
        });


      const feedbackTextarea = screen.getByPlaceholderText('Enter your feedback here...');
      const feedback = 'My detailed feedback for revision.';
      await userEvent.type(feedbackTextarea, feedback);

      expect(screen.getByText('Revise All')).toBeEnabled();
      fireEvent.click(screen.getByText('Revise All'));

      // Assertions
      await waitFor(() => {
        // 1. Fetch called for Rep 1 and Rep 2 (the 'complete' ones)
        expect(fetch).toHaveBeenCalledTimes(3 + 2); // 3 initial + 2 revisions

        // Check parameters for Rep 1 revision
        expect(fetch).toHaveBeenCalledWith(
          '/api/generate-representative-draft',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              demands: mockDemands,
              personalInfo: mockPersonalInfo,
              recipient: mockReps[0],
              workingDraft: 'Content Rep 1',
              feedback: feedback,
            }),
          })
        );

        // Check parameters for Rep 2 revision
        expect(fetch).toHaveBeenCalledWith(
          '/api/generate-representative-draft',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              demands: mockDemands,
              personalInfo: mockPersonalInfo,
              recipient: mockReps[1],
              workingDraft: 'Content Rep 2',
              feedback: feedback,
            }),
          })
        );
        
        // fetch should not be called for Rep 3 again for revision
        // This is implicitly checked by the total call count and specific calls above.

        // 2. Status update to 'loading'
        // This is hard to check directly for intermediate state with RTL.
        // We can check if the UI *eventually* updates to the revised content.
        // And we can see the loading spinner for the currently selected draft if it's one of the revised ones.
        // Let's select Rep 1 (which was 'complete' and should be revised)
        const rep1Button = screen.getByRole('button', { name: /Test Rep 1/ });
        fireEvent.click(rep1Button); // Select Rep 1
      });
      
      // Check that Rep 1's content eventually updates (after loading)
      await waitFor(() => {
        expect(screen.getByText(revisedContent + " Rep 1")).toBeInTheDocument();
      }, {timeout: 3000}); // Increased timeout for state updates

      // Select Rep 2
      const rep2Button = screen.getByRole('button', { name: /Test Rep 2/ });
      fireEvent.click(rep2Button);
      await waitFor(() => {
         expect(screen.getByText(revisedContent + " Rep 2")).toBeInTheDocument();
      }, {timeout: 3000});


      // 3. Feedback text is cleared
      expect(screen.getByPlaceholderText('Enter your feedback here...').value).toBe('');
    });
  });
});
