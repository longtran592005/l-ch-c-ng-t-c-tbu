import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode; // Optional custom fallback UI
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: _, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // You can also log error messages to an error reporting service here
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  private handleRetry = () => {
    // Reset the error state to re-render the children
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Card className="m-4 border-destructive bg-destructive/10 text-destructive">
          <CardHeader>
            <CardTitle>Đã xảy ra lỗi!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg">Có vẻ như đã xảy ra sự cố không mong muốn.</p>
            <details className="whitespace-pre-wrap text-sm text-destructive-foreground">
              <summary>Chi tiết lỗi</summary>
              <p className="mt-2 font-mono text-xs">{this.state.error && this.state.error.toString()}</p>
              <pre className="mt-2 font-mono text-xs overflow-auto">
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
            <Button variant="destructive" onClick={this.handleRetry}>
              Thử lại
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
