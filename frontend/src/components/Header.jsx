import { Link, useNavigate } from 'react-router-dom';

/**
 * Header/Navbar Component
 * Displays navigation menu with logout functionality
 */
const Header = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo/App Name */}
          <Link to="/home" className="text-2xl font-bold">
            EduBot
          </Link>

          {/* Navigation Menu */}
          <nav className="flex items-center space-x-6">
            <Link
              to="/home"
              className="hover:text-blue-200 transition-colors"
            >
              Home
            </Link>
            <Link
              to="/chatbot"
              className="hover:text-blue-200 transition-colors"
            >
              Chatbot
            </Link>
            {user?.name && (
              <span className="text-blue-200">Welcome, {user.name}</span>
            )}
            <button
              onClick={handleLogout}
              className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded transition-colors"
            >
              Logout
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
