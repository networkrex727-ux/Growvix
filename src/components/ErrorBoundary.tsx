import React from 'react';
import { ShieldAlert, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo: JSON.stringify(errorInfo)
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6 animate-pulse">
            <ShieldAlert size={48} />
          </div>
          
          <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tighter">
            Something Went Wrong
          </h1>
          
          <p className="text-gray-500 font-medium max-w-xs mb-8">
            We encountered an unexpected error. Don't worry, your data is safe.
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="w-full max-w-lg bg-gray-50 p-4 rounded-2xl mb-8 text-left overflow-auto max-h-40 border border-gray-100">
              <p className="text-xs font-mono text-red-600 font-bold mb-2">{this.state.error.toString()}</p>
              <pre className="text-[10px] font-mono text-gray-400 leading-tight">
                {this.state.errorInfo}
              </pre>
            </div>
          )}

          <div className="flex flex-col w-full max-w-xs gap-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#ff0000] text-white py-4 rounded-2xl font-black shadow-xl shadow-red-100 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-sm tracking-widest"
            >
              <RotateCcw size={18} />
              Try Again
            </button>
            
            <button
              onClick={this.handleReset}
              className="w-full bg-white text-gray-600 py-4 rounded-2xl font-black border-2 border-gray-100 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-sm tracking-widest"
            >
              <Home size={18} />
              Back to Home
            </button>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-50 w-full max-w-xs">
            <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.2em]">
              Growvix Security System
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
