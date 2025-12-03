'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for auth errors in URL
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        'Configuration': 'Authentication configuration error. Please try again.',
        'Verification': 'The magic link has expired or already been used. Please request a new one.',
        'Default': 'An authentication error occurred. Please try again.'
      };
      setError(errorMessages[errorParam] || errorMessages['Default']);
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (status === 'authenticated') {
      router.push(redirect);
    }
  }, [status, redirect, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);

    try {
      const result = await signIn('resend', {
        email,
        redirect: false,
        callbackUrl: redirect,
      });

      if (result?.error) {
        setError('Failed to send magic link. Please try again.');
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Failed to sign in:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-primary rounded-full animate-spin"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="mb-8 text-center">
          <Link href="/" className="text-primary hover:underline text-sm mb-4 inline-block">
            ← Back to home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Sign In</h1>
          <p className="text-gray-600">
            Sign in to create campaigns and generate messages for your representatives.
          </p>
        </div>

        <div className="bg-white p-4 md:p-8 rounded-lg shadow-md">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✉️</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Check your email!</h2>
              <p className="text-gray-600 mb-4">
                We sent a magic link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-gray-500">
                Click the link in your email to sign in. The link will expire in 24 hours.
              </p>
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                }}
                className="mt-6 text-primary hover:underline text-sm"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="your.email@example.com"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-white py-3 px-4 rounded-md hover:bg-opacity-90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!email || loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending magic link...
                  </span>
                ) : (
                  'Send magic link'
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                We'll send you an email with a link to sign in. No password needed!
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
