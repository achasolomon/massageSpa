import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux'; // Import Redux Provider
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter
import store from './store'; // Import the configured store
import App from './App.jsx';
import './index.css';

// Import Stripe
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

// Replace with your actual publishable key (use environment variables in real app)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY'); // Placeholder Key

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Wrap the entire app with Redux Provider */}
    <Provider store={store}>
      {/* Wrap the entire App or specific routes needing Stripe with Elements */}
      <Elements stripe={stripePromise}>
        {/* Wrap the App component with BrowserRouter */}
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Elements>
    </Provider>
  </React.StrictMode>,
);
