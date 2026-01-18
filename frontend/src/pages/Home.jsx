import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

/**
 * Home / Chatbot Landing Page
 * Protected route - accessible only after login
 */
const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Get user data from localStorage
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Handle chatbot button click
  const handleOpenChatbot = () => {
    navigate('/chatbot');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to EduBot
            </h1>
            {user?.name && (
              <p className="text-xl text-gray-600 mb-2">
                Hello, <span className="font-semibold text-blue-600">{user.name}</span>!
              </p>
            )}
            <p className="text-lg text-gray-500">
              Your AI Powered College Enquiry Assistant
            </p>
          </div>

          {/* Main Content Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-8">
              <div className="inline-block bg-blue-100 rounded-full p-6 mb-6">
                <svg
                  className="w-16 h-16 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Get Started with EduBot
              </h2>
              <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                Ask any questions about our college, courses, admissions, facilities, 
                or any other inquiries. Our AI assistant is here to help you 24/7.
              </p>
            </div>

            {/* Chatbot Button */}
            <button
              onClick={handleOpenChatbot}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-colors text-lg"
            >
              Open Chatbot
            </button>
          </div>

          {/* Features Section */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 text-3xl mb-4">💬</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                24/7 Support
              </h3>
              <p className="text-gray-600 text-sm">
                Get instant answers to your questions anytime, anywhere.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 text-3xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Fast Response
              </h3>
              <p className="text-gray-600 text-sm">
                Quick and accurate information about college facilities and courses.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-blue-600 text-3xl mb-4">🎓</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Comprehensive Info
              </h3>
              <p className="text-gray-600 text-sm">
                Access detailed information about admissions, courses, and more.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
