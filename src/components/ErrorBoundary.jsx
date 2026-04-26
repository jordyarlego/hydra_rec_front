import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("HydraRec crash:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="crash-screen">
          <AlertTriangle size={40} color="#fb923c" strokeWidth={1.5} />
          <h2>Sistema temporariamente offline</h2>
          <p>Não foi possível carregar o HydraRec.<br />Verifique se o servidor está rodando e recarregue.</p>
          <button onClick={() => window.location.reload()}>Tentar novamente</button>
        </div>
      );
    }
    return this.props.children;
  }
}
