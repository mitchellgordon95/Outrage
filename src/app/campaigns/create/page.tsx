import { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CampaignForm from '@/components/campaigns/CampaignForm';

export const metadata: Metadata = {
  title: 'Create Campaign | Outrage',
  description: 'Create a new campaign to mobilize support for issues you care about',
};

export default async function CreateCampaignPage() {
  const session = await auth();

  if (!session) {
    redirect('/login?redirect=/campaigns/create');
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-primary hover:underline text-sm mb-4 inline-block">
            ← Back to home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Create a Campaign
          </h1>
          <p className="text-gray-600">
            Start a movement around an issue you care about. Others can join and send messages to their representatives.
          </p>
        </div>

        <div className="bg-white p-4 md:p-8 rounded-lg shadow-md">
          <CampaignForm />
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Campaign Guidelines
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Be respectful and civil</li>
            <li>• Focus on issues, not personal attacks</li>
            <li>• No hate speech, profanity, or violent language</li>
            <li>• Campaigns are reviewed for quality and appropriateness</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
