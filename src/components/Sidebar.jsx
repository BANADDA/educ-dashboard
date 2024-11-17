import { getAuth, signOut } from 'firebase/auth';
import {
  Building2,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const menuItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/',
      badge: null
    },
    {
      title: 'Schools',
      icon: Building2,
      path: '/schools',
      badge: null
    },
    {
      title: 'Teachers',
      icon: GraduationCap,
      path: '/teachers',
      badge: '45'
    },
    // {
    //   title: 'Students',
    //   icon: Users,
    //   path: '/students',
    //   badge: '970'
    // },
    {
      title: 'Parents',
      icon: Library,
      path: '/parents',
      badge: null
    },
    // {
    //   title: 'Reports',
    //   icon: BarChart3,
    //   path: '/reports',
    //   badge: null
    // },
    // {
    //   title: 'Settings',
    //   icon: Settings,
    //   path: '/settings',
    //   badge: null
    // }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-16 lg:w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center lg:justify-start px-4 border-b border-gray-200">
        <img
          src="https://img.freepik.com/premium-vector/education-logo-white-background_1277164-19941.jpg?w=740"
          alt="Logo"
          className="w-8 h-8 lg:mr-3"
        />
        <span className="hidden lg:block text-lg font-bold">School Admin</span>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1 flex-grow">
        {menuItems.map((item) => (
          <Link
            key={item.title}
            to={item.path}
            className={`flex items-center justify-center lg:justify-start px-3 py-3 rounded-lg transition-colors duration-200 relative group
              ${isActive(item.path)
                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            <item.icon className="w-6 h-6 lg:mr-3" />
            <span className="hidden lg:block">{item.title}</span>
            {item.badge && (
              <span className="hidden lg:flex absolute right-3 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs font-medium">
                {item.badge}
              </span>
            )}

            {/* Tooltip for mobile */}
            <div className="lg:hidden absolute left-full ml-6 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-300">
              <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap">
                {item.title}
              </div>
              <div className="absolute top-1/2 right-full -translate-y-1/2 border-8 border-transparent border-r-gray-900" />
            </div>
          </Link>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-2 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center lg:justify-start px-3 py-3 rounded-lg transition-colors duration-200 text-gray-600 hover:bg-gray-50 group relative"
        >
          <LogOut className="w-6 h-6 lg:mr-3" />
          <span className="hidden lg:block">Logout</span>

          {/* Tooltip for mobile */}
          <div className="lg:hidden absolute left-full ml-6 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-300">
            <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap">
              Logout
            </div>
            <div className="absolute top-1/2 right-full -translate-y-1/2 border-8 border-transparent border-r-gray-900" />
          </div>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;