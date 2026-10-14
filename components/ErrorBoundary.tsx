import React, { Component, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ErrorHandler } from '../lib/errorHandler';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  errorId?: string;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const appError = ErrorHandler.handleError(error, info.componentStack ?? 'ErrorBoundary');
    this.setState({ errorId: appError.code });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorId: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            An unexpected error occurred. Our team has been notified if error monitoring is enabled.
          </Text>
          {this.state.errorId ? (
            <Text style={styles.errorId}>Reference: {this.state.errorId}</Text>
          ) : null}
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: '#0f172a',
    marginBottom: 12,
  },
  message: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  errorId: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#0891b2',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: '#fff',
  },
});
