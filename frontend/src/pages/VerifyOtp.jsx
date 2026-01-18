import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

/**
 * OTP Verification Page
 * Verifies user email with OTP (4-6 digits supported)
 */
const VerifyOtp = () => {
  const navigate = useNavigate();
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [email, setEmail] = useState('');

  // Get email from localStorage
  useEffect(() => {
    const registrationEmail = localStorage.getItem('registrationEmail');
    if (!registrationEmail) {
      // No email found, redirect to registration
      navigate('/register');
      return;
    }
    setEmail(registrationEmail);
  }, [navigate]);

  // Handle OTP input change (only digits, max 6 to support both 4 and 6 digit OTPs)
  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    setErrorMessage('');
  };

  // Handle OTP submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Validate OTP (accept 4-6 digits as Message Central can send either)
    if (otp.length < 4 || otp.length > 6) {
      setErrorMessage('Please enter a valid OTP (4-6 digits)');
      return;
    }

    setLoading(true);

    try {
      // Get country code from localStorage (stored during registration) or use default
      const countryCode = localStorage.getItem('registrationCountryCode') || '91';
      
      const response = await authAPI.verifyOtp({
        email,
        otp,
        countryCode,
      });

      if (response.success) {
        setSuccessMessage('Email verified. Waiting for admin approval.');
        
        // Clear registration email from localStorage
        localStorage.removeItem('registrationEmail');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || 'Invalid or expired OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify Mobile
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the OTP sent to your mobile number
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {successMessage}
              <p className="mt-2 text-sm">Redirecting to login page...</p>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {errorMessage}
            </div>
          )}

          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
              Enter OTP
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              maxLength={6}
              value={otp}
              onChange={handleOtpChange}
              className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest"
              placeholder="0000"
              disabled={loading || successMessage}
            />
            <p className="mt-2 text-xs text-gray-500 text-center">
              Enter the OTP code sent to your mobile number
            </p>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || successMessage || otp.length < 4 || otp.length > 6}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Didn't receive OTP?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Register again
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyOtp;
