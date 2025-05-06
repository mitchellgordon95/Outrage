interface DraftRequest {
  facts: string[];
  name?: string;
  votingHistory?: string;
  representativeName?: string;
  representativeOffice?: string;
}

interface DraftResponse {
  subject: string;
  content: string;
}

export async function generateDraft(request: DraftRequest): Promise<DraftResponse> {
  try {
    const response = await fetch('/api/generate-draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Error generating draft: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating draft:', error);
    throw error;
  }
}