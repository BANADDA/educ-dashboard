import {
    Bell,
    Book,
    GraduationCap,
    Menu,
    Search,
    Trophy,
    Users
} from 'lucide-react';
import { useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    RadialBar,
    RadialBarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

const Dashboard = ({ onMenuClick }) => {
  const [showSearch, setShowSearch] = useState(false);

  // Gender Distribution Data
  const genderData = [
    { name: 'Boys', value: 450, color: '#4f46e5' },
    { name: 'Girls', value: 520, color: '#ec4899' }
  ];

  

  // Class-wise Distribution
  const classDistribution = [
    { name: 'Grade 1', students: 180, male: 85, female: 95 },
    { name: 'Grade 2', students: 175, male: 82, female: 93 },
    { name: 'Grade 3', students: 165, male: 78, female: 87 },
    { name: 'Grade 4', students: 170, male: 80, female: 90 },
    { name: 'Grade 5', students: 160, male: 75, female: 85 },
    { name: 'Grade 6', students: 120, male: 50, female: 70 }
  ];

  // Performance Data
  const performanceData = [
    { 
      grade: 'Grade 1',
      English: 88,
      Mathematics: 85,
      Science: 90,
      Arts: 95
    },
    { 
      grade: 'Grade 2',
      English: 86,
      Mathematics: 88,
      Science: 89,
      Arts: 94
    },
    { 
      grade: 'Grade 3',
      English: 87,
      Mathematics: 89,
      Science: 88,
      Arts: 93
    },
    { 
      grade: 'Grade 4',
      English: 85,
      Mathematics: 90,
      Science: 87,
      Arts: 92
    },
    { 
      grade: 'Grade 5',
      English: 89,
      Mathematics: 86,
      Science: 91,
      Arts: 94
    },
    { 
      grade: 'Grade 6',
      English: 90,
      Mathematics: 88,
      Science: 92,
      Arts: 95
    }
  ];

  const statsData = [
    { 
      icon: Users,
      title: "Total Students",
      value: "970",
      subtitle: "Across all grades",
      trend: "+5%",
      color: "blue"
    },
    {
      icon: GraduationCap,
      title: "Teaching Staff",
      value: "45",
      subtitle: "Dedicated teachers",
      trend: "+2",
      color: "emerald"
    },
    {
      icon: Trophy,
      title: "Average Score",
      value: "88.5%",
      subtitle: "All subjects",
      trend: "+2.4%",
      color: "violet"
    },
    {
      icon: Book,
      title: "Subjects",
      value: "5",
      subtitle: "All subjects",
      trend: "+10",
      color: "orange"
    }
  ];

  // Activity Distribution
  const activityData = [
    { name: 'Sports', value: 280, color: '#10b981' },
    { name: 'Music', value: 210, color: '#6366f1' },
    { name: 'Art', value: 180, color: '#f59e0b' },
    { name: 'Science Club', value: 160, color: '#8b5cf6' }
  ];

  // Stat Card Component
  const StatCard = ({ icon: Icon, title, value, subtitle, trend, color }) => (
    <div className="relative overflow-hidden bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-gradient-to-br from-gray-50 to-gray-100 transform rotate-45 rounded-full opacity-50" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-${color}-50 ring-2 ring-${color}-100`}>
            <Icon className={`w-6 h-6 text-${color}-500`} />
          </div>
          {trend && (
            <span className={`text-sm font-medium px-2.5 py-1 rounded-full bg-${color}-50 text-${color}-600`}>
              {trend}
            </span>
          )}
        </div>
        <div>
          <p className={`text-3xl font-bold bg-gradient-to-r from-${color}-600 to-${color}-400 bg-clip-text text-transparent`}>
            {value}
          </p>
          <h3 className="text-sm font-medium text-gray-700 mt-1">{title}</h3>
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm shadow-sm px-4 md:px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={onMenuClick}
              className="p-2 hover:bg-gray-100 rounded-lg md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                School Dashboard
              </h1>
              <div className="text-xs md:text-sm text-gray-500">Learning Analytics</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6">
            <div className={`${showSearch ? 'flex' : 'hidden md:flex'} absolute md:relative right-0 left-0 top-full md:top-auto p-4 md:p-0 bg-white md:bg-transparent`}>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                />
              </div>
            </div>
            
            <button className="p-2 relative hover:bg-gray-100 rounded-lg">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <img src="https://img.freepik.com/premium-vector/education-logo-white-background_1277164-19941.jpg?w=740" alt="Profile" className="w-8 h-8 rounded-full ring-2 ring-violet-500/20" />
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          {statsData.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
          {/* Performance Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Academic Performance</h2>
                <p className="text-sm text-gray-500">Subject-wise analysis by grade</p>
              </div>
              <div className="flex gap-2">
                {['English', 'Mathematics', 'Science', 'Arts'].map((subject, index) => (
                  <span key={index} className={`text-xs px-2.5 py-1 rounded-full 
                    ${index === 0 ? 'bg-blue-50 text-blue-600' : 
                      index === 1 ? 'bg-emerald-50 text-emerald-600' :
                      index === 2 ? 'bg-violet-50 text-violet-600' :
                      'bg-pink-50 text-pink-600'}`}>
                    {subject}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <defs>
                    {[
                      { id: 'english', color: '#3b82f6' },
                      { id: 'mathematics', color: '#10b981' },
                      { id: 'science', color: '#8b5cf6' },
                      { id: 'arts', color: '#ec4899' }
                    ].map(({ id, color }) => (
                      <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis 
                    dataKey="grade" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    domain={[60, 100]}
                    ticks={[60, 70, 80, 90, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="English" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fill="url(#english)"
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Mathematics" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fill="url(#mathematics)"
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Science" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    fill="url(#science)"
                    dot={{ fill: '#8b5cf6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Arts" 
                    stroke="#ec4899" 
                    strokeWidth={2}
                    fill="url(#arts)"
                    dot={{ fill: '#ec4899', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gender Distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Student Distribution</h2>
                <p className="text-sm text-gray-500">Gender ratio analysis</p>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {genderData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        stroke="none"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    formatter={(value, name) => [`${value} Students`, name]}
                  />
                  <Legend 
                    verticalAlign="middle" 
                    align="right" 
                    layout="vertical"
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Class-wise Distribution */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Students by Grade Level</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="male" name="Boys" fill="#4f46e5" />
                  <Bar dataKey="female" name="Girls" fill="#ec4899" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Extra-curricular Activities */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Student Activities Participation</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  innerRadius="30%" 
                  outerRadius="100%" 
                  data={activityData}
                  startAngle={180} 
                  endAngle={0}
                >
                  <RadialBar
                    minAngle={15}
                    background
                    clockWise={true}
                    dataKey="value"
                    cornerRadius={15}
                  >
                    {activityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </RadialBar>
                  <Legend 
                    iconSize={10}
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                  />
                  <Tooltip />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 md:mt-8 text-center text-xs md:text-sm text-gray-500">
          © Copyright Primary School Analytics 2024. All rights reserved
        </div>
      </div>
    </div>
  );
};

export default Dashboard;