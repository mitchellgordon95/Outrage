import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk');

const mockCreate = vi.fn();
// @ts-ignore
Anthropic.prototype.messages = { create: mockCreate };

// Helper to create a NextRequest
const createMockRequest = (body: any, method: string = 'POST') => {
  const url = 'http://localhost/api/generate-representative-draft';
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : null,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

describe('POST /api/generate-representative-draft', () => {
  let originalApiKey: string | undefined;

  beforeEach(() => {
    vi.resetAllMocks();
    // Store and set the API key for tests
    originalApiKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.ANTHROPIC_MODEL = 'claude-test-model'; // Ensure model is also set for consistency
  });

  afterEach(() => {
    // Restore the original API key
    process.env.ANTHROPIC_API_KEY = originalApiKey;
  });

  it('should generate a draft when given valid inputs (no feedback)', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Subject: Test Subject\nMessage:\nTest content for draft' }],
    });

    const requestBody = {
      demands: ['Demand 1: Action on climate change'],
      personalInfo: 'I am a concerned constituent.',
      recipient: { name: 'Rep. Testington', office: 'Congress' },
    };
    const request = createMockRequest(requestBody);

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.subject).toBe('Test Subject');
    expect(body.content).toBe('Test content for draft');
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-test-model',
        system: expect.stringContaining('drafts and revises effective emails'),
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Write an email to my elected representative'),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining(requestBody.demands[0]),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining(requestBody.personalInfo),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining(requestBody.recipient.name),
          }),
        ]),
      })
    );
    // Ensure revision-specific phrases are not present
    expect(mockCreate.mock.calls[0][0].messages[0].content).not.toEqual(expect.stringContaining('revise the following draft'));
  });

  it('should revise a draft when given workingDraft and feedback', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Subject: Revised Subject\nMessage:\nRevised content based on feedback' }],
    });

    const requestBody = {
      demands: ['Demand 1: Action on climate change'], // Demands might still be present
      personalInfo: 'I am a concerned constituent.',
      recipient: { name: 'Rep. Testington', office: 'Congress' },
      workingDraft: 'This is the original draft text that needs improvement.',
      feedback: 'Please make the tone more urgent and add a specific call to action.',
    };
    const request = createMockRequest(requestBody);

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.subject).toBe('Revised Subject');
    expect(body.content).toBe('Revised content based on feedback');
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-test-model',
        system: expect.stringContaining('drafts and revises effective emails'),
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Please revise the following draft email based on the provided feedback:'),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining(requestBody.workingDraft),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining(requestBody.feedback),
          }),
        ]),
      })
    );
  });

  it('should return 400 if demands are missing', async () => {
    const requestBody = {
      // demands: ['Demand 1'], // Missing
      personalInfo: 'Test info',
      recipient: { name: 'Test Rep', office: 'Test Office' },
    };
    const request = createMockRequest(requestBody);

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Missing required parameters');
    expect(mockCreate).not.toHaveBeenCalled();
  });
  
  it('should return 400 if demands array is empty', async () => {
    const requestBody = {
      demands: [], // Empty
      personalInfo: 'Test info',
      recipient: { name: 'Test Rep', office: 'Test Office' },
    };
    const request = createMockRequest(requestBody);

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Missing required parameters');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should return 400 if recipient is missing', async () => {
    const requestBody = {
      demands: ['Demand 1'],
      personalInfo: 'Test info',
      // recipient: { name: 'Test Rep', office: 'Test Office' }, // Missing
    };
    const request = createMockRequest(requestBody);

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Missing required parameters');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid JSON in request body', async () => {
    const request = new NextRequest('http://localhost/api/generate-representative-draft', {
      method: 'POST',
      body: 'This is not JSON',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(request);
    const body = await response.json();
    
    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid JSON in request body');
    expect(mockCreate).not.toHaveBeenCalled();
  });
  
  it('should return 503 if ANTHROPIC_API_KEY is missing', async () => {
    process.env.ANTHROPIC_API_KEY = ''; // Simulate missing API key
    
    const requestBody = {
      demands: ['Demand 1'],
      personalInfo: 'Test info',
      recipient: { name: 'Test Rep', office: 'Test Office' },
    };
    const request = createMockRequest(requestBody);

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe('Service unavailable - API key missing');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should handle Anthropic API errors gracefully', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Anthropic API error'));

    const requestBody = {
      demands: ['Demand 1'],
      personalInfo: 'Test info',
      recipient: { name: 'Test Rep', office: 'Test Office' },
    };
    const request = createMockRequest(requestBody);

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500); // Default error status in the route
    expect(body.error).toBe('Failed to generate draft with AI service');
    expect(mockCreate).toHaveBeenCalledOnce();
  });
  
  it('should correctly parse subject and message from Anthropic response', async () => {
    const anthropicResponseText = "Subject: Parsed Subject\nMessage:\nThis is the parsed message content.\nIt can span multiple lines.";
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: anthropicResponseText }],
    });

    const requestBody = {
      demands: ['Demand 1'],
      recipient: { name: 'Test Rep', office: 'Test Office' },
    };
    const request = createMockRequest(requestBody);
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.subject).toBe('Parsed Subject');
    expect(body.content).toBe("This is the parsed message content.\nIt can span multiple lines.");
  });

  it('should return 500 if Anthropic response is malformed (missing Subject)', async () => {
    const anthropicResponseText = "NoSubjectHere\nMessage:\nThis is the content.";
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: anthropicResponseText }],
    });
    const requestBody = {
      demands: ['Demand 1'],
      recipient: { name: 'Test Rep', office: 'Test Office' },
    };
    const request = createMockRequest(requestBody);
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to generate draft'); // This comes from parseAnthropicResponse returning null
  });

  it('should return 500 if Anthropic response is malformed (missing Message content)', async () => {
    const anthropicResponseText = "Subject: Test Subject\nWrongPrefix:\nThis is the content.";
     mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: anthropicResponseText }],
    });
    const requestBody = {
      demands: ['Demand 1'],
      recipient: { name: 'Test Rep', office: 'Test Office' },
    };
    const request = createMockRequest(requestBody);
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to generate draft');
  });
});
