'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn('credentials', { redirect: false, username, password });
    setLoading(false);
    if (res?.error) {
      setError('Login gagal');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
      <form onSubmit={handleSubmit} className="bg-white shadow rounded p-6 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold text-center">Login</h1>
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <input className="w-full border px-3 py-2 rounded" value={username} onChange={e=>setUsername(e.target.value)} type="text" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input className="w-full border px-3 py-2 rounded" value={password} onChange={e=>setPassword(e.target.value)} type="password" required />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">{loading ? 'Masuk...' : 'Masuk'}</button>
      </form>
    </div>
  );
}