import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Caught error in boundary:", error, errorInfo);
  }

  
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ textAlign: "center", color: "red", marginTop: "2rem" }}>
          <h2>Oops! Something went wrong.</h2>
          <p>Please refresh the page or try again later.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
