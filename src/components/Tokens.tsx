import React, { useState } from "react";
import axios from "axios";
const apiKey = import.meta.env.VITE_HELIUS_API_KEY;

interface Token {
  id: string;
  content: {
    metadata: {
      name: string;
      symbol: string;
    };
    links: {
      image: string;
    };
  };
  token_info: {
    balance: number;
    decimals: number;
    price_info?: {
      price_per_token: number;
      currency: string;
    };
  };
}

interface SolBalance {
  balance: number;
  price_info?: {
    price_per_token: number;
    currency: string;
  };
}

const Tokens: React.FC = () => {
  const [address, setAddress] = useState<string>("");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [solBalance, setSolBalance] = useState<SolBalance | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalValue, setTotalValue] = useState<number>(0);

  const fetchBalances = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tokensResponse, solBalanceResponse, solPriceResponse] =
        await Promise.all([
          axios.post(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
            jsonrpc: "2.0",
            id: "helius-test",
            method: "searchAssets",
            params: {
              ownerAddress: address,
              tokenType: "fungible",
            },
          }),
          axios.post(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
            jsonrpc: "2.0",
            id: "helius-sol-balance",
            method: "getBalance",
            params: [address],
          }),
          axios.get(
            "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
          ),
        ]);

      const fungibleTokens = tokensResponse.data.result.items.filter(
        (item: Token) => item.token_info && item.token_info.balance > 0
      );

      const solBalanceLamports = solBalanceResponse.data.result.value;
      const solPrice = solPriceResponse.data.solana.usd;
      const solBalanceInSol = solBalanceLamports / 1e9;
      setSolBalance({
        balance: solBalanceInSol,
        price_info: {
          price_per_token: solPrice,
          currency: "USD",
        },
      });

      const tokensTotalValue = fungibleTokens.reduce(
        (acc: number, token: Token) => {
          if (token.token_info.price_info) {
            const tokenValue =
              (token.token_info.balance /
                Math.pow(10, token.token_info.decimals)) *
              token.token_info.price_info.price_per_token;
            return acc + tokenValue;
          }
          return acc;
        },
        0
      );
      const solValue = solBalanceInSol * solPrice;
      setTotalValue(tokensTotalValue + solValue);

      const sortedTokens = fungibleTokens.sort((a: Token, b: Token) => {
        const priceA = a.token_info.price_info?.price_per_token || 0;
        const priceB = b.token_info.price_info?.price_per_token || 0;
        return priceB - priceA;
      });

      setTokens(sortedTokens);
    } catch (err) {
      setError("Failed to fetch balances. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderTokenCard = (token: Token | SolBalance, isSol = false) => {
    const balance = isSol
      ? (token as SolBalance).balance
      : (token as Token).token_info.balance /
        Math.pow(10, (token as Token).token_info.decimals);
    const name = isSol ? "Solana" : (token as Token).content.metadata.name;
    const symbol = isSol ? "SOL" : (token as Token).content.metadata.symbol;
    const imageUrl = isSol
      ? "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
      : (token as Token).content.links.image;
    const priceInfo = isSol
      ? (token as SolBalance).price_info
      : (token as Token).token_info.price_info;

    return (
      <div
        key={isSol ? "sol" : (token as Token).id}
        className="bg-gray-800 rounded-xl shadow-lg p-4 flex flex-col md:flex-row items-center hover:shadow-2xl transition-shadow duration-300"
      >
        <div className="w-16 h-16 mb-4 md:mb-0 md:mr-4 flex-shrink-0">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover rounded-full border border-gray-700"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://via.placeholder.com/64?text=?";
            }}
          />
        </div>
        <div className="flex-grow text-center md:text-left">
          <h2 className="text-lg md:text-xl font-semibold text-gray-100">
            {name}
          </h2>
          <p className="text-sm text-gray-400">{symbol}</p>
        </div>
        <div className="text-center md:text-right">
          <p className="text-lg md:text-xl font-medium text-gray-100">
            {balance.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })}
          </p>
          {priceInfo && (
            <p className="text-sm text-green-400">
              ${(balance * priceInfo.price_per_token).toFixed(2)}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto p-4 sm:p-6 md:p-8 lg:p-10 max-w-lg">
        <div className="bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
            Solana Wallet
          </h1>
          <div className="mb-4 sm:mb-6">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter Solana address"
              className="w-full p-3 border border-gray-700 rounded-lg bg-gray-800 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
            <button
              onClick={fetchBalances}
              className="mt-4 w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors duration-300"
            >
              Fetch Balances
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
            </div>
          ) : error ? (
            <p className="text-red-400 text-center text-lg">{error}</p>
          ) : (
            <>
              {(tokens.length > 0 || solBalance) && (
                <>
                  <div className="bg-gradient-to-r from-purple-700 to-purple-800 rounded-xl shadow-lg p-4 sm:p-6 mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                      Total Balance
                    </h2>
                    <p className="text-3xl sm:text-4xl font-bold">
                      ${totalValue.toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-4">
                    {solBalance && renderTokenCard(solBalance, true)}
                    {tokens.map((token) => renderTokenCard(token))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tokens;
