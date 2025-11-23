import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { useAccount } from 'wagmi';

export default function Header() {
  const { isConnected } = useAccount();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            ArcaneFi
          </Link>
          <div className="flex items-center gap-4">
            {isConnected && (
              <nav className="hidden md:flex gap-4">
                <Link
                  href="/trader/register"
                  className="px-4 py-2 text-gray-700 hover:text-primary-600 transition"
                >
                  Register
                </Link>
                <Link
                  href="/deposit"
                  className="px-4 py-2 text-gray-700 hover:text-primary-600 transition"
                >
                  Deposit
                </Link>
                <Link
                  href="/deposit-rari"
                  className="px-4 py-2 text-gray-700 hover:text-primary-600 transition"
                >
                  Rari
                </Link>
                <Link
                  href="/receive"
                  className="px-4 py-2 text-gray-700 hover:text-primary-600 transition"
                >
                  Receive
                </Link>
              </nav>
            )}
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}

