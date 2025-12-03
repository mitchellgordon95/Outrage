import { Metadata } from 'next';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CampaignManageList from '@/components/campaigns/CampaignManageList';

export const metadata: Metadata = {
  title: 'Manage Campaigns | Outrage',
  description: 'Manage your campaigns and track their impact',
};

export default async function ManageCampaignsPage() {
  const session = await auth();

  if (!session) {
    redirect('/?error=auth_required');
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/" className="text-primary hover:underline text-sm mb-4 inline-block">
              ← Back to home
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Your Campaigns
            </h1>
            <p className="text-gray-600">
              Track and share your campaigns
            </p>
          </div>
          <Link
            href="/campaigns/create"
            className="bg-primary text-white py-2 px-6 rounded-lg hover:bg-opacity-90 transition-colors font-medium"
          >
            Create Campaign
          </Link>
        </div>

        <CampaignManageList />
      </div>
    </main>
  );
}
