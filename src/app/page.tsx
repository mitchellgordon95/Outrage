import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full text-center">
        <h1 className="text-4xl font-bold mb-6">Outrage</h1>
        <p className="text-xl mb-8">
          Take action by contacting your elected representatives about issues you care about.
        </p>
        <Link 
          href="/address" 
          className="bg-primary text-white py-3 px-8 rounded-full text-lg font-medium hover:bg-opacity-90 transition-colors"
        >
          Get Started
        </Link>
      </div>
    </main>
  )
}